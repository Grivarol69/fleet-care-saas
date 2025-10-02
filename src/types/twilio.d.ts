// Type declarations for twilio module
// This is a workaround for the Twilio ESM/CJS types issue
declare module 'twilio' {
  export interface Twilio {
    messages: {
      create(options: {
        body: string;
        from: string;
        to: string;
      }): Promise<{ sid: string; status: string }>;
      (messageId: string): {
        fetch(): Promise<{ status: string; sid: string }>;
      };
    };
    api: {
      accounts(accountSid?: string): {
        fetch(): Promise<{ friendlyName: string }>;
      };
    };
  }

  function twilio(accountSid: string, authToken: string): Twilio;

  namespace twilio {
    export type { Twilio };
  }

  export = twilio;
}
