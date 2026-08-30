targetScope = 'subscription'

@description('Deployment region')
param location string = 'koreacentral'

@description('Resource group name')
param resourceGroupName string = 'rg-habitquest'

@description('Globally unique Static Web App name')
param staticWebAppName string

@description('Globally unique backend Web App name')
param backendWebAppName string

@description('Backend runtime database connection string')
@secure()
param databaseUrl string = ''

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module app 'app.bicep' = {
  name: 'habitquest-app'
  scope: resourceGroup
  params: {
    location: location
    staticWebAppName: staticWebAppName
    backendWebAppName: backendWebAppName
    databaseUrl: databaseUrl
  }
}

output resourceGroupName string = resourceGroup.name
output frontendUrl string = app.outputs.frontendUrl
output backendUrl string = app.outputs.backendUrl
