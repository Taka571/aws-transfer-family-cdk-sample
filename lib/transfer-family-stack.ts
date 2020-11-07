import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as iam from '@aws-cdk/aws-iam'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as transfer from '@aws-cdk/aws-transfer'

export class TransferFamilyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.createTransferFamilyResources()
  }

  createTransferFamilyResources() {
    // Roles
    const transferRole = new iam.Role(this, 'transferRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
    })

    transferRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'))

    const transferLogRole = new iam.Role(this, 'transferLogRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
    })

    transferLogRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSTransferLoggingAccess'))

    // S3 Bucket
    const homeS3Bucket = new s3.Bucket(this, 'homeS3Bucket', {
      bucketName: 'sftp-home-bucket',
      encryption: s3.BucketEncryption.S3_MANAGED,
    })

    // VPC
    const vpc = new ec2.Vpc(this, 'transferSftpVpc', {
      cidr: "10.0.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'transferSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ]
    })

    // Subnets
    const subnetIds = vpc.publicSubnets.map((subnet) => subnet.subnetId)

    // ElasticIp
    const addressAllocationIds = subnetIds.map((_, i) => (new ec2.CfnEIP(this, `transferElasticIp${i}`, {})).attrAllocationId)

    // SFTP transfer server
    const transferSftpServer = new transfer.CfnServer(this, 'transferSftpServer', {
      'endpointType': 'VPC',
      'endpointDetails': {
        'addressAllocationIds': addressAllocationIds,
        'subnetIds': subnetIds,
        'vpcId': vpc.vpcId,
      },
      'identityProviderType': 'SERVICE_MANAGED',
      'loggingRole': transferLogRole.roleArn,
      'protocols': ['SFTP']
    })

    // user
    new transfer.CfnUser(this, 'transferUser', {
      'userName': 'transfer-user',
      'homeDirectory': `/${homeS3Bucket.bucketName}`,
      'role': transferRole.roleArn,
      'serverId': transferSftpServer.attrServerId,
      'sshPublicKeys': ['ssh-rsa xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'] // set your ssh public keys
    })

    // security group
    new ec2.SecurityGroup(this, 'transferSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'transfer-sftp-server-sg'
    })
  }
}
