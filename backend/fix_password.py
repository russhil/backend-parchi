from database import get_supabase
from auth import get_password_hash

def fix_passwords():
    print("Generating valid password hash for 'password'...")
    new_hash = get_password_hash("password")
    print(f"Valid Hash: {new_hash}")
    
    client = get_supabase()
    
    # Update Smith
    print("Updating 'smith'...")
    res = client.table("users").update({"password_hash": new_hash}).eq("username", "smith").execute()
    if res.data:
        print("✅ Smith updated.")
    else:
        print("❌ Smith not found or update failed.")

    # Update Jones
    print("Updating 'jones'...")
    res = client.table("users").update({"password_hash": new_hash}).eq("username", "jones").execute()
    if res.data:
        print("✅ Jones updated.")
    else:
        print("❌ Jones not found or update failed.")

if __name__ == "__main__":
    fix_passwords()
