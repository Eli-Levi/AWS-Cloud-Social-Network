# CloudFinalProject
Final project in "Big Data &amp; Cloud Computing" course at Ariel-University.

## Table of Contents
- [Introduction](#Introduction)
- [Installation](#Installation)
- [Architecture](#Architecture)
- [License](#License)

## Introduction

I implemented and deployed a social network API using AWS cloud infrastracture.


## Installation
### Install AWS CLI
```bash
# Download the AWS CLI 
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Unzip the package
unzip awscliv2.zip

# Install the AWS CLI
sudo ./aws/install

# Clean up the installation files 
rm -rf awscliv2.zip aws
```

### Set your Credentials
Run `aws configure` then update your account keys and configurations at `~/.aws/credentials` and `~/.aws/config`.

for verification, run `aws s3 ls`, and make sure that you see some s3 bucket from you account. 

### Install AWS CDK 
```bash
# Install Typescript
npm -g install typescript

# Install CDK
npm install -g aws-cdk

# Verify that CDK Is installed
cdk --version
```

### Bootstrap your account for CDK
> Note that: If you already bootstrap your account, no need to execute that action again
```bash
# Go to CDK
cd linkup-cdk

# Install NPM models
npm install

# Run bootsrap
cdk bootstrap --template bootstrap-template.yaml
```

### Deploy the Base Stack
Deploy the infrastracture to the cloud using:
```bash
cdk deploy
```

## Architecture 

Here are the AWS cloud infrastracture components used in the project:

- API Gateway (REST API)
-  Lambda Functions
-  S3
-  DynamoDB

### Flow Diagrams and Main Features
Here are presented some flow diagrams for main application features (all could be seen in the video above):

### Create/Get a user and Delete an existing user

<center><img src="https://github.com/Eli-Levi/AWS-Cloud-Social-Network/blob/main/flow-charts/Create_Get_Delete_User.png" alt="description of the image"></center>

### Upload a profile picture to an existing user
<center><img src="https://github.com/Eli-Levi/AWS-Cloud-Social-Network/blob/main/flow-charts/Upload_User_Profile_Picture.png" alt="description of the image"></center>

## License
This project is licensed under the GNU GPLv3 License. See the LICENSE file for details.
