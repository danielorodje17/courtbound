from dotenv import load_dotenv
load_dotenv()

import os
from supabase import create_client, Client

supa: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)
