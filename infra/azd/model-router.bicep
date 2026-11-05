targetScope = 'resourceGroup'

param accountName string = 'habitquestai50887'
param identityName string = 'habitquest-aca-pull-50887'

resource account 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: accountName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: identityName
}

var inferenceRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

resource inferenceAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, identity.id, inferenceRoleId)
  scope: account
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', inferenceRoleId)
  }
}

output endpoint string = account.properties.endpoint
output clientId string = identity.properties.clientId
