import boto3
import json

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("usersTable")

def handler(event, context):
    user_name = event.get("user")
    email = event.get("email")
    user_id = event.get("userId") 

    if not (user_name and email and user_id):
        return {"statusCode": 400, "body": "missing email, username, or user ID"}
    
    try:
        # Query the DynamoDB table using the GSI for the email
        response = users_table.query(
            IndexName='email',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('email').eq(email)
        )
        
        # Check if any items are returned
        if 'Items' in response and len(response['Items']) > 0:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Email already exists'})
            }

        # Corrected userId to user_id here
        userIdResponse = users_table.get_item(Key={"userId": user_id})
        if 'Item' in userIdResponse and len(userIdResponse['Item']) > 0:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'User ID already exists'})
            }

        # Corrected the typo from users.table to users_table and from userid to user_id
        users_table.put_item(Item={"userId": user_id, "email": email, "user_name": user_name, "hasProfilePicture": False})
        
        return {"statusCode": 200, "body": "User created"} 
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)})
        }
