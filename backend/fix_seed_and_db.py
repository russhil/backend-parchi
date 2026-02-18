from auth import get_password_hash
from database import get_supabase

def update_db_and_seed():
    # 1. Generate valid hash for "password"
    print("Generating new hash...")
    valid_hash = get_password_hash("password")
    print(f"New Valid Hash: {valid_hash}")

    # 2. Update DB users
    client = get_supabase()
    print("Updating active database users...")
    client.table("users").update({"password_hash": valid_hash}).in_("username", ["smith", "jones"]).execute()
    print("✅ Database updated.")

    # 3. Read reset_and_seed.sql
    seed_path = "reset_and_seed.sql"
    try:
        with open(seed_path, "r") as f:
            content = f.read()
        
        # 4. Replace the old hash with the new one
        # The old hash in the file is: $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.6PH.s.QzJ/u1uW2x/m0x1u
        old_hash_snippet = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.6PH.s.QzJ/u1uW2x/m0x1u"
        
        if old_hash_snippet in content:
            new_content = content.replace(old_hash_snippet, valid_hash)
            with open(seed_path, "w") as f:
                f.write(new_content)
            print("✅ reset_and_seed.sql updated with new hash.")
        else:
            print("⚠️ Could not find old hash in reset_and_seed.sql to replace. Please check manually.")
            
    except Exception as e:
        print(f"Error updating seed file: {e}")

if __name__ == "__main__":
    update_db_and_seed()
