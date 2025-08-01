#!/usr/bin/env python3

import subprocess
import json
import sys

def run_redis_command(command):
    """Run a Redis command through docker compose"""
    result = subprocess.run(
        ['docker', 'compose', 'exec', '-T', 'redis', 'redis-cli'] + command.split(),
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def main():
    print("🔧 Reassigning ALL services to moon.pl.kr@gmail.com...")
    print()
    
    # Get moon nest ID
    moon_nest_id = run_redis_command('get nest:email:moon.pl.kr@gmail.com').strip('"')
    
    if not moon_nest_id or moon_nest_id == "(nil)":
        print("❌ Could not find nest for moon.pl.kr@gmail.com")
        sys.exit(1)
    
    print(f"✅ Found moon nest: {moon_nest_id}")
    print()
    
    # Get all service IDs
    service_ids = run_redis_command('hkeys scheduler:services').split()
    
    print(f"Found {len(service_ids)} services in scheduler")
    print()
    
    reassigned_count = 0
    
    for service_id in service_ids:
        # Get service data
        service_data_str = run_redis_command(f'hget scheduler:services {service_id}')
        
        try:
            # Parse JSON
            service_data = json.loads(service_data_str)
            
            # Display info
            print(f"📋 Processing: {service_data.get('name', 'Unknown')} ({service_data.get('type', 'Unknown')})")
            print(f"   Old nest: {service_data.get('nestId', 'Unknown')}")
            
            # Update nest ID
            old_nest_id = service_data.get('nestId')
            service_data['nestId'] = moon_nest_id
            
            # Save back to Redis
            updated_json = json.dumps(service_data)
            
            # Use subprocess to pipe the JSON data
            process = subprocess.Popen(
                ['docker', 'compose', 'exec', '-T', 'redis', 'redis-cli', '-x', 'hset', 'scheduler:services', service_id],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                text=True
            )
            process.communicate(input=updated_json)
            
            print(f"   New nest: {moon_nest_id}")
            print("   ✅ Reassigned")
            print()
            
            if old_nest_id != moon_nest_id:
                reassigned_count += 1
            
        except json.JSONDecodeError as e:
            print(f"   ❌ Error parsing JSON: {e}")
            print()
    
    print(f"✅ Reassigned {reassigned_count} service(s) to moon nest!")
    print()
    
    # Now update the nest's service list
    print("Updating nest's service list...")
    
    services_list = []
    
    for service_id in service_ids:
        service_data_str = run_redis_command(f'hget scheduler:services {service_id}')
        try:
            service_data = json.loads(service_data_str)
            
            if service_data.get('nestId') == moon_nest_id:
                # Build service object for nest
                service_obj = {
                    'id': service_id,
                    'nestId': moon_nest_id,
                    'name': service_data.get('name', ''),
                    'type': service_data.get('type', ''),
                    'target': service_data.get('target', ''),
                    'interval': service_data.get('interval', 60),
                    'isActive': service_data.get('enabled', True),
                    'createdAt': service_data.get('createdAt', int(subprocess.run(['date', '+%s000'], capture_output=True, text=True).stdout.strip())),
                    'updatedAt': int(subprocess.run(['date', '+%s000'], capture_output=True, text=True).stdout.strip()),
                    'lastCheck': service_data.get('lastCheck'),
                    'monitoring': service_data.get('monitoring', {
                        'regions': ['eu-central-1', 'eu-west-1', 'us-east-1'],
                        'strategy': 'round-robin',
                        'minRegions': 1,
                        'maxRegions': 3
                    })
                }
                services_list.append(service_obj)
                print(f"✅ Added to nest list: {service_obj['name']}")
        except json.JSONDecodeError:
            pass
    
    # Save services list to Redis
    services_json = json.dumps(services_list)
    process = subprocess.Popen(
        ['docker', 'compose', 'exec', '-T', 'redis', 'redis-cli', '-x', 'set', f'nest:{moon_nest_id}:services'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True
    )
    process.communicate(input=services_json)
    
    print()
    print(f"✅ Updated nest with {len(services_list)} service(s)")
    print()
    print("✨ Done! Services should now appear in the admin panel.")

if __name__ == "__main__":
    main()