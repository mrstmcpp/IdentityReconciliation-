# Bitespeed Identity Reconciliation API

## Endpoint

**POST** `/identify`

## Request Body

```json
{
  "email": "example@domain.com",
  "phoneNumber": "1234567890"
}
```

At least one of `email` or `phoneNumber` must be provided.

## Response

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["example@domain.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2, 3]
  }
}
```

