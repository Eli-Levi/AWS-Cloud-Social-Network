import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class RestaurantsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const labRole = iam.Role.fromRoleArn(this, 'Role', "arn:aws:iam::294813114505:role/LabRole", {mutable: false});
    
    // Create DynamoDB table  
    const table = this.createDynamoDBTable(labRole);

    // Create an S3 bucket for profile pictures
    const profilePicturesBucket = new s3.Bucket(this, 'ProfilePicturesBucket', {
      bucketName: "eli-levi-profile-pictures-bucket",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    profilePicturesBucket.grantReadWrite(labRole);

    // Create Lambda functions and API Gateway
    this.createApiGatewayWithLambdas(table, profilePicturesBucket, labRole);
  }

  private createApiGatewayWithLambdas(table: dynamodb.Table, profilePicturesBucket: s3.Bucket, labRole: cdk.aws_iam.IRole) {
    
    // Create a Lambda function for creating a new user
    const createUserLambda = new lambda.Function(this, 'createUserLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('../service-files/lambda'), 
      handler: 'createUser.handler',
      role: labRole,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantWriteData(createUserLambda);

    // Create a Lambda function for deleting a user by ID
    const deleteUserLambda = new lambda.Function(this, 'deleteUserLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('../service-files/lambda'),
      handler: 'deleteUser.handler',
      role: labRole,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantWriteData(deleteUserLambda);

    // Create a Lambda function for getting a user by ID
    const getUserLambda = new lambda.Function(this, 'getUserLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('../service-files/lambda'),
      handler: 'getUser.handler',
      role: labRole,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadData(getUserLambda);

    // Lambda for generating pre-signed URL for uploading profile picture
    const uploadProfilePictureLambda = new lambda.Function(this, 'uploadProfilePictureLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('../service-files/lambda'), 
      handler: 'uploadProfilePicture.handler',
      role: labRole,
      environment: {
          BUCKET_NAME: profilePicturesBucket.bucketName,
      },
    });

    profilePicturesBucket.grantReadWrite(uploadProfilePictureLambda);

    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'SocialNetworkApi', {
      restApiName: 'Social Network Service',
      description: 'This service handles user operations for the social network.',
    });

    // Create the 'users' resource
    const users = api.root.addResource('users');
  
    // Create the '{id}' resource under 'users'
    const userById = users.addResource('{id}');

    // Map the GET method to the getUserLambda
    userById.addMethod('GET', new apigateway.LambdaIntegration(getUserLambda)); // GET /users/{id}

    // Map the DELETE method to the deleteUserLambda
    userById.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserLambda)); // DELETE /users/{id}
  
    // Create the 'profile-picture' resource under '{id}'
    const profilePicture = userById.addResource('profile-picture');
    
    // Map the PUT method to the uploadProfilePictureLambda
    profilePicture.addMethod('PUT', new apigateway.LambdaIntegration(uploadProfilePictureLambda)); // PUT /users/{id}/profile-picture

    // Add the POST method for creating a new user under /users
    users.addMethod('POST', new apigateway.LambdaIntegration(createUserLambda, {
      proxy: false,
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Content-Type": "'application/json'"
          }
        }
      ]
    }), {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }
      ]
    }); // POST /users
  }

  private createDynamoDBTable(labRole: cdk.aws_iam.IRole) {
   // DynamoDB Table for Users
   const usersTable = new dynamodb.Table(this, 'UsersTable', {
    tableName: "usersTable",
    partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  // GSI for querying top-rated restaurants by geo_location and cuisine
  usersTable.addGlobalSecondaryIndex({
    indexName: 'email',
    partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  usersTable.grantFullAccess(labRole);

  new cdk.CfnOutput(this, 'TableName', {
    value: usersTable.tableName,
  });

  return usersTable;
  }
}