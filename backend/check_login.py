from database import verify_login, get_supabase
from auth import verify_password, get_password_hash

def test_login():
    print("--- Testing Login Logic ---")
    
    # 1. Check Clinic
    print("1. Checking Clinic 'apollo'...")
    client = get_supabase()
    clinic = client.table("clinics").select("*").eq("slug", "apollo").execute()
    if not clinic.data:
        print("❌ Clinic 'apollo' NOT FOUND.")
    else:
        print(f"✅ Clinic found: {clinic.data[0]['id']}")
        
    # 2. Check User
    print("\n2. Checking User 'smith'...")
    user = client.table("users").select("*").eq("username", "smith").execute()
    if not user.data:
        print("❌ User 'smith' NOT FOUND.")
        return
    
    u = user.data[0]
    print(f"✅ User found: {u['username']}")
    print(f"   Stored Clinic ID: {u['clinic_id']}")
    print(f"   Stored Hash: {u['password_hash']}")
    
    # 3. Test Password
    print("\n3. Verifying Password 'password'...")
    is_valid = verify_password("password", u['password_hash'])
    if is_valid:
        print("✅ Password 'password' is VALID.")
    else:
        print("❌ Password 'password' is INVALID.")
        print("   Re-hashing 'password' to see what it looks like now:")
        print(f"   New Hash: {get_password_hash('password')}")

    # 4. formatting verify_login call
    print("\n4. Calling verify_login('smith', 'password', 'apollo')...")
    result = verify_login('smith', 'password', 'apollo')
    if result:
        print(f"✅ Login SUCCESS! Result: {result}")
    else:
        print("❌ Login FAILED (verify_login returned None).")

if __name__ == "__main__":
    test_login()
