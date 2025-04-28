import SourcesWebClient from './SourcesWeb.Client'

const SourcesWeb = ({ sources, ...props }: any) => {
    // TODO: Check why making requests from here makes the app not work
    // const sources = await prisma.document
    //   .findMany({
    //     where: {
    //       source: 'web'
    //     },
    //     take: 50
    //   })
    //   .then((data: any) => JSON.parse(JSON.stringify(data)));

    return <SourcesWebClient {...props} />
}

export default SourcesWeb
