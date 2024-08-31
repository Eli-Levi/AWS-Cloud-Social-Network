import boto3
import json

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")
users_table = dynamodb.Table("usersTable")
bucket_name = "eli-levi-profile-pictures-bucket"

def handler(event, context):
    user_id = event.get("queryStringParameters").get("userId")

    if not user_id:
        return {"statusCode": 400, "body": "missing user ID"}
    
    try:
        userIdResponse = users_table.get_item(Key={"userId": user_id})
        
        if 'Item' in userIdResponse and len(userIdResponse['Item']) > 0:
            user_item = userIdResponse['Item']
            profile_picture_url = None

            if user_item.get("hasProfilePicture", False):
                try:
                    # Generate the S3 object key
                    s3_key = f"{user_id}.*"
                    
                    # List objects with the given prefix
                    response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=user_id)
                    if 'Contents' in response and len(response['Contents']) > 0:
                        # Assuming there's only one object with this prefix
                        s3_key = response['Contents'][0]['Key']
                        
                        # Generate the presigned URL
                        profile_picture_url = s3_client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': bucket_name, 'Key': s3_key},
                            ExpiresIn=3600
                        )
                except Exception as s3_error:
                    return {
                        'statusCode': 500,
                        'body': json.dumps({'message': 'Error generating presigned URL', 'error': str(s3_error)})
                    }

            # Add the ProfilePicture key to the response
            user_item["ProfilePicture"] = profile_picture_url
            
            return {
                'statusCode': 200,
                'body': json.dumps(user_item)
            }
        
        return {"statusCode": 404, "body": "User not found"} 
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)})
        }
