export interface IdentifyRequestBody {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface ContactResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export interface ContactRow {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
