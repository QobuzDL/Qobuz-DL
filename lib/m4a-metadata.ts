export interface MetadataAtoms {
    tags: Record<string, any>;
    userTags: any[];
    cover: { data: Uint8Array } | null;
}

export function parseMp4Atoms(dataView: DataView) {
    const atoms = [];
    let offset = 0;

    while (offset + 8 <= dataView.byteLength) {
        let size = dataView.getUint32(offset, false);
        if (size === 0) {
            size = dataView.byteLength - offset;
        } else if (size === 1) {
            if (offset + 16 > dataView.byteLength) break;
            const sizeLow = dataView.getUint32(offset + 12, false);
            size = sizeLow;
        }

        if (size < 8 || offset + size > dataView.byteLength) break;

        const type = String.fromCharCode(
            dataView.getUint8(offset + 4),
            dataView.getUint8(offset + 5),
            dataView.getUint8(offset + 6),
            dataView.getUint8(offset + 7)
        );

        atoms.push({ type, offset, size });
        offset += size;
    }
    return atoms;
}

export function rebuildMp4WithMetadata(dataView: DataView, atoms: any[], metadataAtoms: MetadataAtoms) {
    const originalArray = new Uint8Array(dataView.buffer);
    const moovAtom = atoms.find((a) => a.type === 'moov');
    if (!moovAtom) return originalArray;

    const newMetadataBytes = createMetadataBlock(metadataAtoms);
    const moovChildren = parseMp4Atoms(new DataView(originalArray.buffer, moovAtom.offset + 8, moovAtom.size - 8));
    const filteredMoovChildren = moovChildren.filter((a) => a.type !== 'udta');

    let newMoovSize = 8;
    for (const child of filteredMoovChildren) newMoovSize += child.size;
    newMoovSize += newMetadataBytes.length;

    const sizeDiff = newMoovSize - moovAtom.size;
    const newFileSize = originalArray.length + sizeDiff;
    const newFile = new Uint8Array(newFileSize);
    
    let offset = 0;
    let originalOffset = 0;

    const atomsBeforeMoov = atoms.filter((a) => a.offset < moovAtom.offset);
    for (const atom of atomsBeforeMoov) {
        newFile.set(originalArray.subarray(atom.offset, atom.offset + atom.size), offset);
        offset += atom.size;
        originalOffset += atom.size;
    }

    newFile[offset++] = (newMoovSize >> 24) & 0xff;
    newFile[offset++] = (newMoovSize >> 16) & 0xff;
    newFile[offset++] = (newMoovSize >> 8) & 0xff;
    newFile[offset++] = newMoovSize & 0xff;
    newFile[offset++] = 0x6d; newFile[offset++] = 0x6f; newFile[offset++] = 0x6f; newFile[offset++] = 0x76;

    for (const child of filteredMoovChildren) {
        const absoluteChildStart = moovAtom.offset + 8 + child.offset;
        newFile.set(originalArray.subarray(absoluteChildStart, absoluteChildStart + child.size), offset);
        offset += child.size;
    }

    newFile.set(newMetadataBytes, offset);
    offset += newMetadataBytes.length;
    originalOffset = moovAtom.offset + moovAtom.size;

    const mdatAtom = atoms.find((a) => a.type === 'mdat');
    if (mdatAtom && moovAtom.offset < mdatAtom.offset) {
        updateChunkOffsets(newFile, offset - newMoovSize, newMoovSize, sizeDiff);
    }

    if (originalOffset < originalArray.length) {
        newFile.set(originalArray.subarray(originalOffset), offset);
    }

    return newFile;
}

function createMetadataBlock(metadataAtoms: MetadataAtoms) {
    const { tags, userTags, cover } = metadataAtoms;
    const ilstChildren = [];

    for (const [key, value] of Object.entries(tags)) {
        if (key === 'trkn' || key === 'disk') ilstChildren.push(createIntAtom(key, value));
        else if (key === 'rtng') ilstChildren.push(createUintAtom(key, value, 1));
        else if (key === 'tmpo') ilstChildren.push(createUintAtom(key, value, 2));
        else ilstChildren.push(createStringAtom(key, value));
    }

    for (const [namespace, name, value] of userTags) {
        ilstChildren.push(createUserAtom(namespace, name, value));
    }

    if (cover) ilstChildren.push(createCoverAtom(cover.data));

    const ilstSize = 8 + ilstChildren.reduce((acc, buf) => acc + buf.length, 0);
    const ilst = new Uint8Array(ilstSize);
    let offset = 0;

    writeAtomHeader(ilst, offset, ilstSize, 'ilst');
    offset += 8;
    for (const child of ilstChildren) {
        ilst.set(child, offset);
        offset += child.length;
    }

    const hdlrContent = new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 0x6d, 0x64, 0x69, 0x72, 0x61, 0x70, 0x70, 0x6c, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    
    const finalMetaSize = 12 + (8 + hdlrContent.length) + ilstSize;
    const finalMeta = new Uint8Array(finalMetaSize);
    offset = 0;
    writeAtomHeader(finalMeta, offset, finalMetaSize, 'meta');
    offset += 8;
    finalMeta[offset++] = 0; finalMeta[offset++] = 0; finalMeta[offset++] = 0; finalMeta[offset++] = 0;

    writeAtomHeader(finalMeta, offset, 8 + hdlrContent.length, 'hdlr');
    finalMeta.set(hdlrContent, offset + 8);
    offset += 8 + hdlrContent.length;
    finalMeta.set(ilst, offset);

    const udtaSize = 8 + finalMetaSize;
    const udta = new Uint8Array(udtaSize);
    writeAtomHeader(udta, 0, udtaSize, 'udta');
    udta.set(finalMeta, 8);

    return udta;
}

function createStringAtom(type: string, value: string) {
    const textBytes = new TextEncoder().encode(value);
    const dataSize = 16 + textBytes.length;
    const atomSize = 8 + dataSize;
    const buf = new Uint8Array(atomSize);
    writeAtomHeader(buf, 0, atomSize, type);
    writeAtomHeader(buf, 8, dataSize, 'data');
    buf[16] = 0; buf[17] = 0; buf[18] = 0; buf[19] = 1;
    buf.set(textBytes, 24);
    return buf;
}

function createUserAtom(namespace: string, name: string, value: string) {
    const encoder = new TextEncoder();
    const ns = encoder.encode(namespace);
    const nm = encoder.encode(name);
    const val = encoder.encode('\x00\x00\x00\x01\x00\x00\x00\x00' + value);
    const atomSize = 8 + 12 + ns.length + 12 + nm.length + 8 + val.length;
    const buf = new Uint8Array(atomSize);
    let offset = 0;
    writeAtomHeader(buf, offset, atomSize, '----'); offset += 8;
    writeAtomHeader(buf, offset, ns.length + 12, 'mean'); offset += 12;
    buf.set(ns, offset); offset += ns.length;
    writeAtomHeader(buf, offset, nm.length + 12, 'name'); offset += 12;
    buf.set(nm, offset); offset += nm.length;
    writeAtomHeader(buf, offset, val.length + 8, 'data'); offset += 8;
    buf.set(val, offset);
    return buf;
}

function createUintAtom(key: string, value: number, intByteLength = 1) {
    const dataSize = 16 + intByteLength;
    const atomSize = 8 + dataSize;
    const buf = new Uint8Array(atomSize);
    writeAtomHeader(buf, 0, atomSize, key);
    writeAtomHeader(buf, 8, dataSize, 'data');
    buf[16] = 0; buf[17] = 0; buf[18] = 0; buf[19] = 21;
    buf[24] = value & 0xff; 
    return buf;
}

function createIntAtom(type: string, value: any) {
    // Apple exige exactamente 6 bytes de payload para 'disk' y 8 bytes para 'trkn'
    const payloadSize = type === 'disk' ? 6 : 8;
    const dataSize = 16 + payloadSize;
    const atomSize = 8 + dataSize;
    
    const buf = new Uint8Array(atomSize);
    writeAtomHeader(buf, 0, atomSize, type);
    writeAtomHeader(buf, 8, dataSize, 'data');
    
    buf[16] = 0; buf[17] = 0; buf[18] = 0; buf[19] = 0;
    
    const current = parseInt(typeof value === 'object' ? value.current : value) || 0;
    const total = parseInt(typeof value === 'object' ? value.total : 0) || 0;
    
    // Construcción binaria del payload
    buf[24] = 0; buf[25] = 0;
    buf[26] = (current >> 8) & 0xff; buf[27] = current & 0xff;
    buf[28] = (total >> 8) & 0xff; buf[29] = total & 0xff;
    
    // Si es 'trkn' (8 bytes), el Uint8Array ya dejó buf[30] y buf[31] en 0, cumpliendo el padding.
    return buf;
}

function createCoverAtom(imageBytes: Uint8Array) {
    const dataSize = 16 + imageBytes.length;
    const atomSize = 8 + dataSize;
    const buf = new Uint8Array(atomSize);
    writeAtomHeader(buf, 0, atomSize, 'covr');
    writeAtomHeader(buf, 8, dataSize, 'data');
    buf[16] = 0; buf[17] = 0; buf[18] = 0; buf[19] = (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) ? 14 : 13;
    buf.set(imageBytes, 24);
    return buf;
}

function writeAtomHeader(buf: Uint8Array, offset: number, size: number, type: string) {
    buf[offset] = (size >> 24) & 0xff; buf[offset + 1] = (size >> 16) & 0xff;
    buf[offset + 2] = (size >> 8) & 0xff; buf[offset + 3] = size & 0xff;
    for (let i = 0; i < 4; i++) buf[offset + 4 + i] = type.charCodeAt(i);
}

function updateChunkOffsets(buffer: Uint8Array, moovOffset: number, moovSize: number, shift: number) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    findAndShiftOffsets(view, moovOffset + 8, moovOffset + moovSize, shift);
}

function findAndShiftOffsets(view: DataView, start: number, end: number, shift: number) {
    let offset = start;
    while (offset + 8 <= end) {
        const size = view.getUint32(offset, false);
        const type = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6), view.getUint8(offset + 7));
        if (size < 8) break;
        if (['trak', 'mdia', 'minf', 'stbl'].includes(type)) {
            findAndShiftOffsets(view, offset + 8, offset + size, shift);
        } else if (type === 'stco') {
            const count = view.getUint32(offset + 12, false);
            for (let i = 0; i < count; i++) {
                const entryOffset = offset + 16 + i * 4;
                view.setUint32(entryOffset, view.getUint32(entryOffset, false) + shift, false);
            }
        } else if (type === 'co64') {
            const count = view.getUint32(offset + 12, false);
            for (let i = 0; i < count; i++) {
                const entryOffset = offset + 16 + i * 8;
                const oldHigh = view.getUint32(entryOffset, false);
                const oldLow = view.getUint32(entryOffset + 4, false);
                let newLow = oldLow + shift;
                let carry = 0;
                if (newLow > 0xffffffff) {
                    carry = Math.floor(newLow / 0x100000000);
                    newLow = newLow >>> 0;
                }
                view.setUint32(entryOffset, oldHigh + carry, false);
                view.setUint32(entryOffset + 4, newLow, false);
            }
        }
        offset += size;
    }
}