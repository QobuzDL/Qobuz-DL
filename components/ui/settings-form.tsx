'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDownIcon, DotIcon, InfoIcon, SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from './input';
import { ModeToggle } from '../mode-toggle';
import { nameVariables, SettingsProps, useSettings } from '@/lib/settings-provider';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from './slider';

const losslessCodecs = ['FLAC', 'ALAC', 'WAV'];

const qualityMap = {
    '27': [24, 192],
    '7': [24, 96],
    '6': [16, 44.1]
};

const SettingsForm = () => {
    const { settings, setSettings, resetSettings } = useSettings();

    const [open, setOpen] = useState(false);

    const bitrateInput = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open && bitrateInput.current) {
            let numberInput = parseInt(bitrateInput.current.value);
            if (isNaN(numberInput)) numberInput = 320;
            if (numberInput > 320) numberInput = 320;
            if (numberInput < 24) numberInput = 320;
            setSettings((prev) => ({ ...prev, bitrate: numberInput || 320 }));
        }
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={setOpen} modal={true}>
            <Button
                variant='outline'
                size='icon'
                onClick={() => {
                    setOpen(true);
                }}
            >
                <SettingsIcon />
            </Button>
            <SheetContent className='flex flex-col gap-4 overflow-hidden'>
                <div className='flex flex-col gap-4 pt-4 h-full overflow-y-scroll scrollbar-hide'>
                    <SheetHeader>
                        <div className='flex flex-col my-1'>
                            <SheetTitle>Theme</SheetTitle>
                            <SheetDescription>Change the way {process.env.NEXT_PUBLIC_APPLICATION_NAME} looks</SheetDescription>
                        </div>
                        <ModeToggle />
                    </SheetHeader>
                    <Separator />
                    <SheetHeader>
                        <div className='flex flex-col my-1'>
                            <SheetTitle>Background</SheetTitle>
                            <SheetDescription>Change the background of {process.env.NEXT_PUBLIC_APPLICATION_NAME}</SheetDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant='outline' className='flex gap-2 items-center'>
                                    <p className='capitalize'>{settings.particles ? 'Particles' : 'Solid Color'}</p>
                                    <ChevronDownIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='start'>
                                <DropdownMenuRadioGroup
                                    value={settings.particles ? 'particles' : 'solid color'}
                                    onValueChange={(value: string) => {
                                        setSettings((prev) => ({ ...prev, particles: value === 'particles' }));
                                    }}
                                >
                                    <DropdownMenuRadioItem value='particles'>Particles</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value='solid color'>Solid Color</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SheetHeader>
                    <Separator />
                    <SheetHeader className='space-y-4'>
                        <div className='flex flex-col my-1'>
                            <SheetTitle>Output Settings</SheetTitle>
                            <SheetDescription>Change the way your music is saved</SheetDescription>
                        </div>
                        <div className='space-y-2'>
                            <div className='px-0.5 space-y-2'>
                                <p className='font-medium text-sm'>Zip File Naming</p>
                                <div className='flex gap-2'>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size='icon' className='aspect-square' variant='outline'>
                                                <InfoIcon />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Zip File Naming</DialogTitle>
                                                <DialogDescription>The variables used in the zip file name</DialogDescription>
                                            </DialogHeader>
                                            <p className='text-xs text-muted-foreground'>An example is {'{artists} - {name}'}</p>
                                            <div className='flex flex-col gap-2'>
                                                {nameVariables.map((variable, index) => (
                                                    <div key={index} className='flex text-sm items-center justify-between gap-2'>
                                                        <p>
                                                            <span className='capitalize'>{variable}</span>{' '}
                                                            <span className='text-muted-foreground'>{`{${variable}}`}</span>
                                                        </p>
                                                        <p>{settings.zipName.includes(variable) ? 'Currently used' : 'Not used'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Input value={settings.zipName} onChange={(e) => setSettings((prev) => ({ ...prev, zipName: e.target.value }))} />
                                </div>
                            </div>
                            <div className='px-0.5 space-y-2'>
                                <p className='font-medium text-sm'>Track File Naming</p>
                                <div className='flex gap-2'>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size='icon' className='aspect-square' variant='outline'>
                                                <InfoIcon />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Track File Naming</DialogTitle>
                                                <DialogDescription>The variables used in the track file name</DialogDescription>
                                            </DialogHeader>
                                            <p className='text-xs text-muted-foreground'>An example is {'{artists} - {name}'}</p>
                                            <div className='flex flex-col gap-2'>
                                                {nameVariables.map((variable, index) => (
                                                    <div key={index} className='flex text-sm items-center justify-between gap-2'>
                                                        <p>
                                                            <span className='capitalize'>{variable}</span>{' '}
                                                            <span className='text-muted-foreground'>{`{${variable}}`}</span>
                                                        </p>
                                                        <p>{settings.trackName.includes(variable) ? 'Currently used' : 'Not used'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Input value={settings.trackName} onChange={(e) => setSettings((prev) => ({ ...prev, trackName: e.target.value }))} />
                                </div>
                            </div>
                            <p className='font-medium text-sm'>Output Codec</p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant='outline' className='flex gap-2 items-center'>
                                        <p>{settings.outputCodec}</p>
                                        <ChevronDownIcon />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start'>
                                    <DropdownMenuRadioGroup
                                        value={settings.outputCodec}
                                        onValueChange={(codec: string) => {
                                            setSettings((settings) => ({
                                                ...settings,
                                                outputCodec: codec as SettingsProps['outputCodec']
                                            }));
                                            if (!losslessCodecs.includes(codec)) {
                                                setSettings((settings) => ({
                                                    ...settings,
                                                    outputQuality: settings.outputCodec === 'OPUS' ? ('6' as const) : ('5' as const),
                                                    bitrate: settings.bitrate || 320
                                                }));
                                            } else {
                                                setSettings((settings) => {
                                                    if (settings.outputQuality === '5')
                                                        return {
                                                            ...settings,
                                                            outputQuality: '27' as const,
                                                            bitrate: undefined
                                                        };
                                                    else return { ...settings, bitrate: undefined };
                                                });
                                            }
                                        }}
                                    >
                                        <DropdownMenuRadioItem value='FLAC'>FLAC (recommended)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='WAV'>WAV</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='ALAC'>ALAC</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='MP3'>MP3</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='AAC'>AAC</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='OPUS'>OPUS</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {losslessCodecs.includes(settings.outputCodec) ? (
                            <div className='space-y-2'>
                                <p className='font-medium text-sm'>Max Download Quality</p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant='outline' className='flex gap-2 items-center'>
                                            {parseQualityHTML(settings.outputQuality)}
                                            <ChevronDownIcon />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='start'>
                                        <DropdownMenuRadioGroup
                                            value={settings.outputQuality}
                                            onValueChange={(quality: string) => {
                                                setSettings((settings) => ({
                                                    ...settings,
                                                    outputQuality: quality as SettingsProps['outputQuality']
                                                }));
                                            }}
                                        >
                                            <DropdownMenuRadioItem value={'27'}>
                                                <p>24-bit</p>
                                                <DotIcon />
                                                <p>192kHz</p>
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value={'7'}>
                                                <p>24-bit</p>
                                                <DotIcon />
                                                <p>96kHz</p>
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value={'6'}>
                                                <p>16-bit</p>
                                                <DotIcon />
                                                <p>44.1kHz</p>
                                            </DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <>
                                <p className='text-xs text-muted-foreground text-center'>
                                    Lossy codec selected. All music will be downloaded at 320kbps. You can specify a bitrate to rencode to below.
                                </p>
                                <div className='flex items-center gap-2 w-full justify-center'>
                                    <Input ref={bitrateInput} max={320} min={24} className='w-fit' type='number' defaultValue={settings.bitrate} />
                                    <p>kbps</p>
                                </div>
                            </>
                        )}
                        <div className='flex items-center gap-2 pt-2'>
                            <div className='flex flex-col'>
                                <p className={cn('font-medium', settings.outputCodec === 'WAV' && 'text-muted-foreground')}>Apply metadata</p>
                                <p className={cn('text-xs', settings.outputCodec === 'WAV' ? 'text-muted-background' : 'text-muted-foreground')}>
                                    If enabled (default), songs will be tagged with cover art, album information, etc.
                                </p>
                            </div>
                            <Checkbox
                                checked={settings.applyMetadata && settings.outputCodec !== 'WAV'}
                                onCheckedChange={(checked: boolean) => setSettings((settings) => ({ ...settings, applyMetadata: checked }))}
                                disabled={settings.outputCodec === 'WAV'}
                            />
                        </div>
                        {settings.outputCodec === 'OPUS' && (
                            <p className='text-xs text-destructive font-semibold text-center'>WARNING: OGG (OPUS) files do not support album art.</p>
                        )}
                        {settings.outputCodec === 'WAV' && (
                            <p className='text-xs text-destructive font-semibold text-center'>WAV files do not support metadata / tags.</p>
                        )}
                    </SheetHeader>
                    <Separator />
                    <SheetHeader>
                        <div className='flex items-center gap-2'>
                            <div className='flex flex-col'>
                                <p className='font-medium'>Fix MD5 Hash</p>
                                <p className='text-xs text-muted-foreground'>
                                    If enabled (default), MD5 hashes will be fixed, improving compatiablity with old software. This will take longer to
                                    download.
                                </p>
                            </div>
                            <Checkbox
                                checked={settings.fixMD5}
                                onCheckedChange={(checked: boolean) => setSettings((settings) => ({ ...settings, fixMD5: checked }))}
                            />
                        </div>
                    </SheetHeader>
                    <Separator />
                    <SheetHeader>
                        <div className='flex items-center gap-2'>
                            <div className='flex flex-col'>
                                <p className='font-medium'>Allow Explicit content</p>
                                <p className='text-xs text-muted-foreground'>If enabled (default), explicit songs will be shown when searching.</p>
                            </div>
                            <Checkbox
                                checked={settings.explicitContent}
                                onCheckedChange={(checked: boolean) => setSettings((settings) => ({ ...settings, explicitContent: checked }))}
                            />
                        </div>
                    </SheetHeader>
                    <Separator />
                    <SheetHeader>
                        <div className='flex flex-col items-center gap-2'>
                            <div className='flex flex-col'>
                                <p className='font-medium'>Max Album Art Size</p>
                                <p className='text-xs text-muted-foreground'>If apply metadata is enabled, album art will be resized to this size.</p>
                            </div>
                            <Slider
                                min={100}
                                max={3600}
                                step={100}
                                value={[settings.albumArtSize]}
                                onValueChange={(value: number[]) => setSettings((settings) => ({ ...settings, albumArtSize: value[0] }))}
                            />
                            <p>
                                {settings.albumArtSize}x{settings.albumArtSize}
                            </p>
                        </div>
                    </SheetHeader>
                    <Separator />
                    <SheetHeader>
                        <div className='flex flex-col items-center gap-2'>
                            <div className='flex flex-col'>
                                <p className='font-medium'>Album Art Quality</p>
                                <p className='text-xs text-muted-foreground'>
                                    If apply metadata is enabled, album art will be compressed to this quality. 100% is lossless.
                                </p>
                            </div>
                            <Slider
                                min={10}
                                max={100}
                                step={1}
                                value={[settings.albumArtQuality * 100]}
                                onValueChange={(value: number[]) => setSettings((settings) => ({ ...settings, albumArtQuality: value[0] / 100 }))}
                            />
                            <p>{Math.round(settings.albumArtQuality * 100)}%</p>
                        </div>
                    </SheetHeader>
                    <Button variant='destructive' onClick={resetSettings}>
                        Reset Settings
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export const parseQualityHTML = (quality: string) => {
    try {
        return (
            <div className='flex items-center'>
                <p>{qualityMap[quality as keyof typeof qualityMap][0]}-bit</p>
                <DotIcon className='min-h-[24px] min-w-[24px]' size={24} />
                <p>{qualityMap[quality as keyof typeof qualityMap][1]} kHz</p>
            </div>
        );
    } catch {
        return quality;
    }
};

export default SettingsForm;
