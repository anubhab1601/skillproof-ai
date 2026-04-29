import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillproof-ai';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: normalizedEmail },
          },
        },
        limit: 1,
      },
    };

    const firestoreRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
    });

    if (firestoreRes.ok) {
      const results = await firestoreRes.json();
      const hasDocument = results.some(r => r.document);

      if (hasDocument) {
        const doc = results.find(r => r.document);
        const fields = doc.document.fields;
        const existingRole = fields?.role?.stringValue || 'unknown';

        if (existingRole === role) {
          return NextResponse.json(
            { error: `An account with this email already exists as a ${role}. Please login instead.` },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: `This email is already registered as a ${existingRole}. A single email can only be used for one role.` },
            { status: 409 }
          );
        }
      }
    }

    return NextResponse.json({ ok: true, message: 'Email is available' });
  } catch (error) {
    console.error('check-email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
