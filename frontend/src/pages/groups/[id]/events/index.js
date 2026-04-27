import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";

export default function GroupEvents() {
    const router = useRouter();
    const { id } = router.query;
    return (
        <Layout title={`События группы #${id}`} mock>
            <div className="empty-state">
                Список событий группы. Будет реализован вместе с группами.
            </div>
        </Layout>
    );
}
