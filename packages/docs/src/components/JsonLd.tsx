import Head from '@docusaurus/Head'

type JsonLdProps = {
    data: Record<string, unknown>
}

export default function JsonLd({ data }: JsonLdProps) {
    return (
        <Head>
            <script type='application/ld+json'>{JSON.stringify(data)}</script>
        </Head>
    )
}
