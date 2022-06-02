/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const { flags } = require('@oclif/command')
const ConsoleCommand = require('../index')
const fs = require('fs')
const { cli } = require('cli-ux')
const { CONFIG_KEYS } = require('../../../config')
const LibConsoleCLI = require('@adobe/aio-cli-lib-console')
const aioConsoleLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-console:workspace:bind', { provider: 'debug' })

class UploadAndBindCommand extends ConsoleCommand {
  async run () {
    aioConsoleLogger.debug('Trying to bind certificate')
    const { args, flags } = this.parse(UploadAndBindCommand)

    const orgId = flags.orgId || this.getConfig(`${CONFIG_KEYS.ORG}.id`)
    if (!orgId) {
      this.log('You have not selected an Organization. Please select first.')
      this.printConsoleConfig()
      this.exit(1)
    }

    const projectId = flags.projectId || this.getConfig(`${CONFIG_KEYS.PROJECT}.id`)
    if (!projectId) {
      this.log('You have not selected a Project. Please select first.')
      this.printConsoleConfig()
      this.exit(1)
    }

    const workspaceId = flags.workspaceId || this.getConfig(`${CONFIG_KEYS.WORKSPACE}.id`)
    if (!workspaceId) {
      this.log('You have not selected a Workspace. Please select first.')
      this.printConsoleConfig()
      this.exit(1)
    }

    const publicKey = args.publicKey
    let stats
    try {
      stats = fs.statSync(publicKey)
    } catch (e) { /* does not exist */ }
    if (!stats || !stats.isFile()) {
      this.error(`Invalid publicKey file: ${publicKey}`)
    }

    await this.initSdk()
    try {
      const consoleConfig = await this.consoleCLI.getWorkspaceConfig(orgId, projectId, workspaceId)

      const project = consoleConfig.project
      const workspace = project.workspace

      const bindings = await this.consoleCLI.uploadAndBindCertificate(
        orgId,
        project,
        workspace,
        args.publicKey
      )

      if (flags.json) {
        this.printJson([bindings])
      } else if (flags.yml) {
        this.printYaml([bindings])
      } else {
        this.printResults([bindings])
      }
      return bindings
    } catch (err) {
      aioConsoleLogger.debug(err)
      this.error(err.message)
    } finally {
      LibConsoleCLI.cleanStdOut()
    }
  }

  printResults (bindings) {
    const columns = {
      bindingId: {
        header: 'ID'
      },
      certificateFingerprint: {
        header: 'Fingerprint'
      },
      notAfter: {
        header: 'Expires'
      }
    }
    cli.table(bindings, columns)
  }
}

UploadAndBindCommand.description = 'Uploads and binds a public key certificate to the selected Workspace'

UploadAndBindCommand.flags = {
  ...ConsoleCommand.flags,
  orgId: flags.string({
    description: 'Organization id of the Console Workspace to bind the public key certificate to'
  }),
  projectId: flags.string({
    description: 'Project id of the Console Workspace to bind the public key certificate to'
  }),
  workspaceId: flags.string({
    description: 'Workspace id of the Console Workspace to bind the public key certificate to'
  }),
  json: flags.boolean({
    description: 'Output json',
    char: 'j',
    exclusive: ['yml']
  }),
  yml: flags.boolean({
    description: 'Output yml',
    char: 'y',
    exclusive: ['json']
  })
}

UploadAndBindCommand.aliases = [
  'console:key:upload'
]

UploadAndBindCommand.args = [
  {
    name: 'publicKey',
    required: true,
    description: 'Path to public key certificate file in PEM format'
  }
]

module.exports = UploadAndBindCommand
