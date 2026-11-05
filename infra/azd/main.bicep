targetScope = 'resourceGroup'

@description('Azure region for resources.')
param location string = 'koreacentral'

@description('Unique azd environment name.')
param environmentName string

@description('Existing Container Apps environment name.')
param containerAppsEnvironmentName string = 'habitquest-aca-env-50887'

@description('Existing Container Registry name.')
param containerRegistryName string = 'habitquestacr50887'

@description('Existing managed identity used to pull images.')
param pullIdentityName string = 'habitquest-aca-pull-50887'

@description('Existing API Container App name.')
param apiName string = 'habitquest-api-aca-50887'

@description('Existing web Container App name.')
param webName string = 'habitquest-web-aca-50887'
param apiFqdn string = 'habitquest-api-aca-50887.whitegrass-9925aedb.koreacentral.azurecontainerapps.io'
param webFqdn string = 'habitquest-web-aca-50887.whitegrass-9925aedb.koreacentral.azurecontainerapps.io'

@description('Container image used during provisioning; azd replaces it during deploy.')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param webImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@secure()
param jwtSecret string

@secure()
param azureOpenAiKey string = ''

param azureOpenAiEndpoint string = ''
param azureOpenAiDeployment string = ''
param foundryAccountName string = 'habitquestai50887'
param foundryModelRouterDeployment string = 'habitquest-model-router'

@secure()
param postgresAdminPassword string

param postgresAdminLogin string = 'habitquestadmin'
param postgresServerName string = 'habitquest-pg-50887'

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: pullIdentityName
}

module modelRouter './model-router.bicep' = {
  name: 'model-router-access'
  params: {
    accountName: foundryAccountName
    identityName: pullIdentityName
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'habitquest'
}

resource postgresAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

var databaseUrl = 'postgresql://${postgresAdminLogin}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/habitquest?sslmode=require'

resource api 'Microsoft.App/containerApps@2025-02-02-preview' = {
  name: apiName
  location: location
  tags: {
    'azd-service-name': 'api'
    'azd-env-name': environmentName
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        transport: 'auto'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
      secrets: [
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'azure-openai-key'
          value: azureOpenAiKey
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3001' }
            { name: 'FRONTEND_URL', value: 'https://${webFqdn}' }
            { name: 'FOUNDRY_MODEL_ROUTER_ENDPOINT', value: modelRouter.outputs.endpoint }
            { name: 'FOUNDRY_MODEL_ROUTER_DEPLOYMENT', value: foundryModelRouterDeployment }
            { name: 'AZURE_CLIENT_ID', value: modelRouter.outputs.clientId }
            { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenAiDeployment }
            { name: 'JWT_EXPIRATION', value: '7d' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'AZURE_OPENAI_API_KEY', secretRef: 'azure-openai-key' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

resource web 'Microsoft.App/containerApps@2025-02-02-preview' = {
  name: webName
  location: location
  tags: {
    'azd-service-name': 'web'
    'azd-env-name': environmentName
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'BACKEND_URL', value: 'https://${apiFqdn}' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.properties.loginServer
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.id
output AZURE_POSTGRES_FQDN string = postgres.properties.fullyQualifiedDomainName
output AZURE_WEB_URL string = 'https://${webFqdn}'
output AZURE_API_URL string = 'https://${apiFqdn}'
