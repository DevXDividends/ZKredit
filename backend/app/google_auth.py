"""
Verifies Google Identity Services ID tokens (sent from the frontend's
"Sign in with Google" button) against Google's public keys, confirming the
token was really issued by Google for OUR app (audience check).

Requires GOOGLE_CLIENT_ID to be set — get one from
https://console.cloud.google.com/apis/credentials (OAuth 2.0 Client ID,
type "Web application"). Add your frontend origin(s) to
"Authorized JavaScript origins" there (e.g. http://localhost:5173).
"""

import os

from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")


def verify_google_token(token: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google sign-in is not configured on the server (GOOGLE_CLIENT_ID missing).",
        )
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token.")

    if idinfo.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token was issued for a different app.")

    return idinfo