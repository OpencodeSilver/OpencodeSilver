export class OpencodeSilverControlError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'OpencodeSilverControlError';
    this.statusCode = statusCode;
    Object.assign(this, details);
  }
}

export const asControlError = (error, fallbackMessage, fallbackStatus = 500) => {
  if (error instanceof OpencodeSilverControlError) return error;
  const message = error instanceof Error ? error.message : fallbackMessage;
  return new OpencodeSilverControlError(message || fallbackMessage, Number(error?.statusCode) || Number(error?.status) || fallbackStatus, {
    ...(error?.goalConfigured === true ? { goalConfigured: true } : {}),
  });
};
