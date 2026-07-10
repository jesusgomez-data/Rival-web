import { getUserTeamCenters } from "../gyms/team-actions";
import CenterChatClient from "./CenterChatClient";

export default async function CenterChatPage({
    searchParams,
}: {
    searchParams: Promise<{ center?: string }>;
}) {
    const params = await searchParams;
    const result = await getUserTeamCenters();

    return (
        <CenterChatClient
            centers={result.centers || []}
            initialCenterId={params?.center || null}
            error={result.error || null}
        />
    );
}
