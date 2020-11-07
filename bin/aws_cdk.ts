#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { TransferFamilyStack } from '../lib/transfer-family-stack'

const app = new cdk.App()
new TransferFamilyStack(app, 'TransferFamilyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
})
