import asyncio
import datetime
import hashlib
from urllib.parse import urlencode
import aiohttp
import re
import base64
from typing import Dict, List

async def get_app_id_and_secrets():
    try:
        seed_timezone_regex = re.compile(r'[a-z]\.initialSeed\("(?P<seed>[\w=]+)",window\.utimezone\.(?P<timezone>[a-z]+)\)')
        app_id_regex = re.compile(r'production:{api:{appId:"(?P<app_id>\d{9})",appSecret:"(\w{32})')

        async with aiohttp.ClientSession() as session:
            async with session.get("https://play.qobuz.com/login") as response:
                login_page = await response.text()

            bundle_url_match = re.search(r'<script src="(/resources/\d+\.\d+\.\d+-[a-z]\d{3}/bundle\.js)"></script>', login_page)
            if not bundle_url_match:
                raise ValueError("Could not find bundle URL.")
            bundle_url = bundle_url_match.group(1)

            async with session.get(f"https://play.qobuz.com{bundle_url}") as response:
                bundle = await response.text()

            app_id_match = app_id_regex.search(bundle)
            if not app_id_match:
                raise ValueError("Could not find app ID.")
            app_id = app_id_match.group("app_id")

            secrets: Dict[str, List[str]] = {}
            for seed_match in seed_timezone_regex.finditer(bundle):
                seed = seed_match.group("seed")
                timezone = seed_match.group("timezone")
                secrets[timezone] = [seed]

            timezones = "|".join([tz.capitalize() for tz in secrets.keys()])
            info_extras_regex = re.compile(rf'name:"\w+/(?P<timezone>{timezones})",info:"(?P<info>[\w=]+)",extras:"(?P<extras>[\w=]+)"')

            for match in info_extras_regex.finditer(bundle):
                timezone = match.group("timezone").lower()
                info = match.group("info")
                extras = match.group("extras")
                if timezone in secrets:
                    secrets[timezone].extend([info, extras])

            decoded_secrets = []
            for secret_array in secrets.values():
                combined_secret = "".join(secret_array)[:-44]
                try:
                    decoded_secret = base64.b64decode(combined_secret).decode("utf-8")
                    if decoded_secret:
                        decoded_secrets.append(decoded_secret)
                except (base64.binascii.Error, UnicodeDecodeError):
                    continue

            valid_secret = ""

            for secret in decoded_secrets:
                timestamp = datetime.datetime.now().timestamp()
                r_sig = f"trackgetFileUrlformat_id27intentstreamtrack_id1{timestamp}{secret}"
                r_sig_hashed = hashlib.md5(r_sig.encode()).hexdigest()

                params = {
                    "format_id": 27,
                    "intent": "stream",
                    "track_id": 1,
                    "request_ts": timestamp,
                    "request_sig": r_sig_hashed,
                }
                url = f"https://www.qobuz.com/api.json/0.2/track/getFileUrl?{urlencode(params)}"

                headers = {
                    "X-App-Id": app_id,
                }
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=headers) as response:
                        if response.status != 400:
                            valid_secret = secret
                            break 
            return {"app_id": app_id, "secret": valid_secret}

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    app_id_and_secrets = asyncio.run(get_app_id_and_secrets())
    print(app_id_and_secrets)