import { registerSettingsHandlers } from './settings.ipc'
import { registerLeadsHandlers } from './leads.ipc'
import { registerTemplatesHandlers } from './templates.ipc'
import { registerCampaignsHandlers } from './campaigns.ipc'
import { registerEmailsHandlers } from './emails.ipc'
import { registerQueueHandlers } from './queue.ipc'
import { registerAuthHandlers } from './auth.ipc'
import { registerValidationHandlers } from './validation.ipc'
import { registerDashboardHandlers } from './dashboard.ipc'
import { registerInboxHandlers } from './inbox.ipc'
import { registerPortfolioHandlers } from './portfolio.ipc'

export function registerAllHandlers(): void {
  registerSettingsHandlers()
  registerLeadsHandlers()
  registerTemplatesHandlers()
  registerCampaignsHandlers()
  registerEmailsHandlers()
  registerQueueHandlers()
  registerAuthHandlers()
  registerValidationHandlers()
  registerDashboardHandlers()
  registerInboxHandlers()
  registerPortfolioHandlers()
}
