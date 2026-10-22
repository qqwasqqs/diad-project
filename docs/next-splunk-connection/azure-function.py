import azure.functions as func
import requests
import time
import json
import os
import urllib3

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

urllib3.disable_warnings()

bp_splunk_query = func.Blueprint()

# ------------------------------------------------------
# CONFIG
# ------------------------------------------------------
SPLUNK_URL = "https://ilsplunapp03t.il.teva.corp:8089"

KEY_VAULT_URL = 'https://kv-oyrbd-wap-euno-dev.vault.azure.net/'
SPLUNK_SECRET_NAME ='kv-fa-splunk-token'

# ------------------------------------------------------
# GET SECRET FROM KEY VAULT USING MANAGED IDENTITY
# ------------------------------------------------------
def get_splunk_token():

    credential = DefaultAzureCredential()

    client = SecretClient(
        vault_url=KEY_VAULT_URL,
        credential=credential
    )

    secret = client.get_secret(SPLUNK_SECRET_NAME)

    return secret.value


# ------------------------------------------------------
# GET AUTH HEADERS
# ------------------------------------------------------
def get_headers():

    token = get_splunk_token()

    return {
        "Authorization": f"Bearer {token}"
    }


# ------------------------------------------------------
# FUNCTION
# ------------------------------------------------------
@bp_splunk_query.function_name(name="fetch_splunk_query")
@bp_splunk_query.route(route="splunk/query", methods=["POST"])
def splunk_query(req: func.HttpRequest) -> func.HttpResponse:

    try:

        req_body = req.get_json()

        SEARCH_QUERY = req_body.get("SEARCH_QUERY")
        START_TIME = req_body.get("START_TIME")
        END_TIME = req_body.get("END_TIME")

        if not SEARCH_QUERY or not START_TIME or not END_TIME:

            return func.HttpResponse(
                "Missing parameters: SEARCH_QUERY, START_TIME, END_TIME",
                status_code=400
            )

        headers = get_headers()

        # ------------------------------------------------------
        # CREATE SPLUNK SEARCH JOB
        # ------------------------------------------------------
        job_resp = requests.post(
            f"{SPLUNK_URL}/services/search/jobs",
            headers=headers,
            data={
                "search": SEARCH_QUERY,
                "earliest_time": START_TIME,
                "latest_time": END_TIME,
                "output_mode": "json"
            },
            verify=False,
            timeout=120
        )

        job_resp.raise_for_status()

        sid = job_resp.json()["sid"]

        # ------------------------------------------------------
        # WAIT FOR JOB COMPLETION
        # ------------------------------------------------------
        while True:

            status_resp = requests.get(
                f"{SPLUNK_URL}/services/search/jobs/{sid}",
                headers=headers,
                params={"output_mode": "json"},
                verify=False,
                timeout=60
            )

            status_resp.raise_for_status()

            status = (
                status_resp.json()["entry"][0]
                ["content"]["dispatchState"]
            )

            if status == "DONE":
                break

            time.sleep(2)

        # ------------------------------------------------------
        # FETCH RESULTS WITH PAGINATION
        # ------------------------------------------------------
        all_results = []
        offset = 0
        page_size = 1000

        while True:

            resp = requests.get(
                f"{SPLUNK_URL}/services/search/jobs/{sid}/results",
                headers=headers,
                params={
                    "output_mode": "json",
                    "count": page_size,
                    "offset": offset
                },
                verify=False,
                timeout=120
            )

            resp.raise_for_status()

            if not resp.text.strip():
                time.sleep(1)
                continue

            data = resp.json()

            batch = data.get("results", [])

            if not batch:
                break

            all_results.extend(batch)

            offset += page_size

        return func.HttpResponse(
            json.dumps(all_results),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:

        return func.HttpResponse(
            str(e),
            status_code=500
        )