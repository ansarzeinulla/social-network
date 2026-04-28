import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";

export default function GroupEvents() {
    const router = useRouter();
    const { id } = router.query;
    return (
        <Layout title={`События группы #${id || ""}`}>
            <div className="empty-state">Список событий группы появится здесь</div>
        </Layout>
    );
}
