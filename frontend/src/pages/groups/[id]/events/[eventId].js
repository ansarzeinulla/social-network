import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";

export default function GroupEvent() {
    const router = useRouter();
    const { id, eventId } = router.query;
    return (
        <Layout title={`Событие #${eventId}`}>
            <div className="card">
                <div className="card-title">Группа: {id}</div>
                <div className="card-meta">Детали события появятся когда модуль будет готов.</div>
            </div>
        </Layout>
    );
}
