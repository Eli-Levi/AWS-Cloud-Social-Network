import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

  /*
  // Environment variables
  const commonEnv = {
    USERS_TABLE_NAME: usersTable.tableName,
    BUCKET_NAME: profilePicturesBucket.bucketName,
  };*/

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
      role: labRole, // important for the lab so the cdk will not create a new role,
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
      role: labRole, // important for the lab so the cdk will not create a new role,
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
      role: labRole, // important for the lab so the cdk will not create a new role,
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
      role: labRole, // important for the lab so the cdk will not create a new role,
      environment: {
          BUCKET_NAME: profilePicturesBucket.bucketName,
      },
    });

    profilePicturesBucket.grantReadWrite(uploadProfilePictureLambda); // perhaps instead of grandPut()?

    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'SocialNetworkApi', {
      restApiName: 'Social Network Service',
      description: 'This service handles user operations for the social network.',
    });

    // Create the 'users' resource once
    const users = api.root.addResource('users');
  
    users.addMethod('POST', new apigateway.LambdaIntegration(createUserLambda,  {
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

    // Create the '{id}' resource under 'users'
    //const user = users.addResource('{id}');
    users.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserLambda,  {
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
    }); // DELETE /users/{id}

    const getUserIntegration = new apigateway.LambdaIntegration(getUserLambda);
    users.addMethod('GET', getUserIntegration); // GET /users/{id}
  
    // Add a new route for generating a pre-signed URL under the '{id}' resource
    //const profilePicture = users.addResource('profile-picture');
    users.addMethod('PUT', new apigateway.LambdaIntegration(uploadProfilePictureLambda,  {
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
    }); // POST /users/{id}/profile-picture*/

    /*// Output API Gateway URL
    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: api.url,
      description: 'API Gateway URL: ',
    });*/
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
