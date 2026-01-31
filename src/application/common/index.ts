/**
 * Application Common
 *
 * Zentrale Exports für gemeinsame Application-Layer Komponenten.
 */

// ActionResult Pattern
export {
  Result,
  type ActionResult,
  type ActionSuccess,
  type ActionFailure,
  type ActionError,
} from './ActionResult';

// Error Codes
export {
  ErrorCodes,
  ErrorMessages,
  getErrorMessage,
  type ErrorCode,
} from './ErrorCodes';
