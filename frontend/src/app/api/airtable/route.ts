import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function GET() {
    try {
        const apiKey = process.env.AIRTABLE_API_KEY;
        const baseId = process.env.AIRTABLE_BASE_ID;

        if(!apiKey || !baseId) {
            return NextResponse.json(
                { error: 'Airtable API key or Base ID is not configured.' },
                { status: 500 }
            );
        }

        const base = new Airtable({ apiKey }).base(baseId);

        //we target the "Submissions" table and only grab pending ones
        const records = await base('Submissions')
            .select({
                filterByFormula: "{Status} = 'Pending'",
                maxRecords: 100,
            })
            .firstPage();

        //Map the raw Airtable rows into the clean JSON our frontend expects
        const submissions = records.map((record) => ({
            id: record.getId(), //Airtable's unique record ID
            github_url: record.get('GitHub URL') || '',
            playable_url: record.get('Playable URL') || '',
            target_program: record.get('Program') || 'Unknown',
            status: record.get('Status') || 'Pending',
            birth_year: record.get('Birth Year') || null,
        }));

        return NextResponse.json(submissions);
    } catch (error) {
        console.error("Airtable fetch error:", error);
        return NextResponse.json(
            { error: 'Failed to fetch data from Airtable.' },
            {status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const apiKey = process.env.AIRTABLE_API_KEY;
        const baseId = process.env.AIRTABLE_BASE_ID;

        if (!apiKey || !baseId) {
            return NextResponse.json(
                { error: 'Airtable API key or Base ID is not configured.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { id, status } = body;

        const base = new Airtable({ apiKey }).base(baseId);

        await base('Submissions').update([
            {
                id: id,
                fields: {
                    Status: status,
                },
            },
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Airtable update error: ", error);
        return NextResponse.json(
            { error: 'Failed to update Airtable.' },
            { status: 500 }
        );
    }
}