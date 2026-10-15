export { getMailConfig, type MailConfig } from './config';
export {
  isMailConfigured,
  sendMail,
  verifyMailConnection,
  MailConfigurationError,
  type SendMailInput,
  type SendMailResult,
  type MailAttachment,
} from './mailer';
export { renderBrandedMail, type BrandedMailInput, type MailAction } from './templates';
