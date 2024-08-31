import boto3
import json

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("usersTable")

def handler(event, context):
    user_id = event.get("userId")
    
    if not user_id:
        return {"statusCode": 400, "body": "missing user ID"}
    
    try:
        # Retrieve the user by userId
        userIdResponse = users_table.get_item(Key={"userId": user_id})
        
        # Check if the user exists
        if 'Item' in userIdResponse and len(userIdResponse['Item']) > 0:
            # If user exists, delete the user
            users_table.delete_item(Key={"userId": user_id})
            return {
                "statusCode": 200,
                "body": json.dumps({'message': 'User deleted successfully'})
            }
        
        return {"statusCode": 404, "body": "User not found"} 
    
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({'message': 'Internal server error', 'error': str(e)})
        }