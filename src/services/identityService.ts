import { prisma } from "../lib/prisma";
import { ContactResponse, ContactRow } from "../types/contactTypes";

export async function identifyContact(
  email?: string | null,
  phoneNumber?: string | null
): Promise<ContactResponse> {
  // query
  const query: { email?: string; phoneNumber?: string }[] = [];
  if (email) query.push({ email });
  if (phoneNumber) query.push({ phoneNumber });

  // find all contacts that match either email or phone
  const matchingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: query,
    },
    orderBy: { createdAt: "asc" },
  });

  // in case got no match
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        linkPrecedence: "primary",
        linkedId: null,
      },
    });

    return buildResponse(newContact.id, [newContact], []);
  }

  // collect all primary ids from matching contacts
  const primaryIds = new Set<number>();

  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === "primary") {
      primaryIds.add(contact.id);
    } else if (contact.linkedId !== null) {
      primaryIds.add(contact.linkedId);
    }
  }

  // fetch all contacts in all matching 
  const allClusterContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: [...primaryIds] } },
        { linkedId: { in: [...primaryIds] } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });


  // geting primary & oldest
  const primaries = allClusterContacts.filter(
    (c: ContactRow) => c.linkPrecedence === "primary"
  );
  primaries.sort(
    (a: ContactRow, b: ContactRow) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const truePrimary = primaries[0]; // oldest primary

  // make rest secondary except first
  if (primaries.length > 1) {
    const secondaryIds = primaries.slice(1).map((p: ContactRow) => p.id); 

    await prisma.contact.updateMany({
      where: { id: { in: secondaryIds } },
      data: {
        linkPrecedence: "secondary",
        linkedId: truePrimary.id,
        updatedAt: new Date(),
      },
    });

    // update secondary contacts of updated secondareis
    await prisma.contact.updateMany({
      where: {
        deletedAt: null,
        linkedId: { in: secondaryIds },
      },
      data: {
        linkedId: truePrimary.id,
        updatedAt: new Date(),
      },
    });
  }
  // fetch again 
  const finalCluster = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: truePrimary.id },
        { linkedId: truePrimary.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });


  // if new info in request
  const clusterEmails = new Set(
    finalCluster.map((c: ContactRow) => c.email).filter(Boolean)
  );
  const clusterPhones = new Set(
    finalCluster.map((c: ContactRow) => c.phoneNumber).filter(Boolean)
  );

  const hasNewEmail = email && !clusterEmails.has(email);
  const hasNewPhone = phoneNumber && !clusterPhones.has(phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    const newSecondary = await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        linkedId: truePrimary.id,
        linkPrecedence: "secondary",
      },
    });

    finalCluster.push(newSecondary);
  }

  // response
  const secondaries = finalCluster.filter(
    (c: ContactRow) => c.id !== truePrimary.id
  );

  return buildResponse(truePrimary.id, finalCluster, secondaries);
}


// Helper: Build the response object
function buildResponse(
  primaryId: number,
  allContacts: ContactRow[],
  secondaries: ContactRow[]
): ContactResponse {
  const emailSet = new Set<string>();
  const emails: string[] = [];

  // adding primary mail
  const primaryContact = allContacts.find((c) => c.id === primaryId);
  if (primaryContact?.email) {
    emailSet.add(primaryContact.email);
    emails.push(primaryContact.email);
  }

  // adding secondary mails
  for (const c of allContacts) {
    if (c.id !== primaryId && c.email && !emailSet.has(c.email)) {
      emailSet.add(c.email);
      emails.push(c.email);
    }
  }

  const phoneSet = new Set<string>();
  const phoneNumbers: string[] = [];

  if (primaryContact?.phoneNumber) {
    phoneSet.add(primaryContact.phoneNumber);
    phoneNumbers.push(primaryContact.phoneNumber);
  }

  for (const c of allContacts) {
    if (c.id !== primaryId && c.phoneNumber && !phoneSet.has(c.phoneNumber)) {
      phoneSet.add(c.phoneNumber);
      phoneNumbers.push(c.phoneNumber);
    }
  }

  const secondaryContactIds = secondaries.map((c) => c.id);

  return {
    contact: {
      primaryContactId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
}
