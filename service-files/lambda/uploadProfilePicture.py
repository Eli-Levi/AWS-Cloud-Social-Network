import boto3
import base64
import json
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('usersTable')

def handler(event, context):
    user_id = event.get("userId")
    b64_profile_picture = event.get("b64ProfilePicture")
    profile_picture_format = event.get("profilePictureFormat")
    print(event)
    
    if not user_id or not b64_profile_picture or not profile_picture_format:
        return {"statusCode": 400, "body": "Missing required parameters"}
    
    file_name = f"{user_id}.{profile_picture_format}"
    
    try:
        # Decode the base64 image
        decoded_image = base64.b64decode(b64_profile_picture)
        
        # Save the image to S3
        s3.put_object(
            Bucket="eli-levi-profile-pictures-bucket",
            Key=file_name,
            Body=decoded_image,
            ContentType=f"image/{profile_picture_format}"
        )
        
        # Update the DynamoDB table
        users_table.update_item(
            Key={"userId": user_id},
            UpdateExpression="set hasProfilePicture = :val",
            ExpressionAttributeValues={":val": True}
        )
        
        # Generate a pre-signed URL
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': "eli-levi-profile-pictures-bucket", 'Key': file_name},
            ExpiresIn=3600  # URL expiry time in seconds
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Upload successful", "presignedUrl": presigned_url})
        }
    
    except ClientError as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error processing request", "error": str(e)})
        }
