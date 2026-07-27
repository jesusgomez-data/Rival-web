import { getRaceResults, getCompetitions } from "./actions";
import { getMyLifts } from "../training/actions";
import { isUserAdmin } from "@/utils/admin";
import HyroxClient from "./HyroxClient";

export const metadata = {
    title: "Mis Marcas | RivalFit",
    description: "Tus PRs de levantamiento y tus marcas de HYROX, Deka y más competencias."
};

export default async function MisMarcasPage() {
    const [results, competitions, isAdmin, lifts] = await Promise.all([
        getRaceResults(),
        getCompetitions(),
        isUserAdmin(),
        getMyLifts()
    ]);

    return <HyroxClient initialResults={results} competitions={competitions} isAdmin={isAdmin} initialLifts={lifts} />;
}
