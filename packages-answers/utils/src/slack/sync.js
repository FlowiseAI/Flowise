import AnswerSession from '../utilities/answerSession';
import SlackClient from './client';
import SlackMessage from './models/message';
import SlackChannel from './models/channel';

const answerSession = new AnswerSession({ namespace: 'slack' });

answerSession.initPinecone({
  namespace: process.env.PINECONE_INDEX_NAMESPACE,
  indexName: 'adam-test-jira-2023-02-08-01'
});

export const indexSingleSlackChannel = async (channelId) => {
  const slackClient = new SlackClient({ accessToken: process.env.SLACK_TOKEN });
  console.time('indexSingleSlackChannel');
  // console.log(slackClient.cache.channels);
  const channel = await slackClient.getChannel(channelId);

  //   const channelInfo = await channel.getInfo();
  let messages = await channel.getMessages();

  //   let promises = [];
  //   for (const message of messages) {
  //     promises.push(new SlackMessage(message));
  //   }

  //   const data = await Promise.all(promises);

  messages.map(async (m) => {
    const tidiedInfo = await m.getTidiedInfo();
    return tidiedInfo;
  });

  //   const vectorData = await answerSession.prepareAllForEmbedding(data);
  // answerSession.addVectors(vectorData);
  //   await answerSession.pinecone.writeVectorsToIndex(vectorData);
  console.timeEnd('indexSingleSlackChannel');
};

export const syncSlack = async () => {
  try {
    //     { id: 'CHAD1M11A', name: 'general' }
    // { id: 'CHBG340BZ', name: 'random' }
    // { id: 'CHBSUNN06', name: 'sava-redesign' }
    // { id: 'CJ15BPCHZ', name: 'optimizely-edu' }
    // { id: 'CLBL3CC9E', name: 'sava-launch-support' }
    // { id: 'CM5R858LV', name: 'optimizely-search' }
    // { id: 'CMDME67BK', name: 'daily-standup' }
    // { id: 'CMW9028BU', name: 'dev-environment-help' }
    // { id: 'CN17HG9L0', name: 'reactjs' }
    // { id: 'CN2S2K6CE', name: 'vscode' }
    // { id: 'CN378HMD2', name: 'frontend' }
    // { id: 'CN6DH569E', name: 'jira' }
    // { id: 'CN76G5MCL', name: 'salesforce' }
    // { id: 'CNT719STU', name: 'new-support-tix' }
    // { id: 'CPZ4C5DKN', name: 'website-contact-form' }
    // { id: 'CSF1J8HV5', name: 'doodletest' }
    // { id: 'CT7BK3FQU', name: 'content-marketing' }
    // { id: 'C010SSM057B', name: 'impossible-foods' }
    // { id: 'C0110DVP52A', name: 'onboarding-justin' }
    // { id: 'C0110QXTQUF', name: 'new-internal-support' }
    // { id: 'C01148LN12S', name: 'contentful' }
    // { id: 'C0114N2J3RB', name: 'lastrev' }
    // { id: 'C011A8WFV9B', name: 'strong-365-external' }
    // { id: 'C011AF28213', name: 'if-system-notifications' }
    // { id: 'C011CB4BL9M', name: 'notion' }
    // { id: 'C011D1321T2', name: 'if-internal-chat' }
    // { id: 'C011HNDN4PP', name: 'dropbox-internal-chat' }
    // { id: 'C011NDW0Y85', name: 'new-ifsd-tix' }
    // { id: 'C011ZNC5APQ', name: 'pr-dropbox' }
    // { id: 'C011ZNH978W', name: 'pr-uwhealth' }
    // { id: 'C012CKDC2KE', name: 'pr-impossible' }
    // { id: 'C012H2L83SA', name: 'support-process' }
    // { id: 'C012K3S67MX', name: 'pr-tatari' }
    // { id: 'C012W9E1EV6', name: 'pull-requests' }
    // { id: 'C013EGR3PAB', name: 'all-support-chat' }
    // { id: 'C013JJH1ET0', name: 'support-ideas' }
    // { id: 'C013TP2A4P7', name: 'if-onboarding' }
    // { id: 'C0143HZUA02', name: 'auth0-internal-chat' }
    // { id: 'C0150Q56ZEH', name: 'tatari-lastrev-external' }
    // { id: 'C015JJW38G7', name: 'adam-brad-office-hours' }
    // { id: 'C0162GX04G3', name: 'project-management' }
    // { id: 'C016Q6W3QDC', name: 'kudos' }
    // { id: 'C0179JYNDEJ', name: 'stale-code-reviews' }
    // { id: 'C019K4V1FSB', name: 'uwh-internal-chat' }
    // { id: 'C019LQEBA8M', name: 'discussions' }
    // { id: 'C019NLWAPQR', name: 'documentation' }
    // { id: 'C019ZSQDD3M', name: 'if-content-model-cleanup' }
    // { id: 'C01AWREJZJT', name: 'competitive-research' }
    // { id: 'C01B3R8M9ND', name: 'uwh-content-entry-shared' }
    // { id: 'C01DJ03JHHU', name: 'oculus-quest' }
    // { id: 'C01E7JTKQBC', name: 'design' }
    // { id: 'C01EXSS33EJ', name: 'sidekick' }
    // { id: 'C01FCTYHA15', name: 'if-migration-external' }
    // { id: 'C01G1PK0YFP', name: 'if-lastrev-forms-external' }
    // { id: 'C01G2S5TR7C', name: 'techstars-lastrev-external' }
    // { id: 'C01GB3KR73R', name: 'if-localized-content' }
    // { id: 'C01JGM0SDRT', name: 'techstars-internal' }
    // { id: 'C01KMSYCH2N', name: 'industry-news' }
    // { id: 'C01LRBUQU1M', name: 'blogs-lr' }
    // { id: 'C01M5UFGGRW', name: 'product-engineering' }
    // { id: 'C01MKRF8JEN', name: 'strong365-internal' }
    // { id: 'C01S3TGLL4W', name: 'tpc-lastrev-external' }
    // { id: 'C01S868S3ED', name: 'karmacheck-internal' }
    // { id: 'C01TNBZDXSR', name: 'karmacheck-lastrev-external' }
    // { id: 'C0219G44E72', name: 'allhands' }
    // { id: 'C0221TBBC7P', name: 'ck-if-lr-external' }
    // { id: 'C025ASV5YJZ', name: 'lr-component-library' }
    // { id: 'C025M1X4R9T', name: 'key-decisions' }
    // { id: 'C0268N8KTPC', name: 'new-kcsd-tix' }
    // { id: 'C0271LBTV17', name: 'dbx-design-lastrev-external' }
    // { id: 'C028C532CQ6', name: 'dispelix-lastrev-external' }
    // { id: 'C028X4VN709', name: 'dispelix-internal' }
    // { id: 'C0297U5LA2C', name: 'sensortower-internal' }
    // { id: 'C02A16K8JR4', name: 'sensortower-lastrev-external' }
    // { id: 'C02CVCQ29RT', name: 'framework-questions' }
    // { id: 'C02EE7DQXNX', name: 'emmy-acosta-interview' }
    // { id: 'C02EFEHNF1D', name: 'gremlin-lastrev-external' }
    // { id: 'C02FSM9GWD9', name: 'gremlin-internal' }
    // { id: 'C02GD7N52HG', name: 'lr-libraries-notifications' }
    // { id: 'C02H3CM46KZ', name: 'last-rev-vanguard-prospecting' }
    // { id: 'C02HJ3N7EQJ', name: 'lastrev-bread' }
    // { id: 'C02HZMAV4SX', name: 'monthly-okrs' }
    // { id: 'C02JK4KJLSH', name: 'cypress-questions' }
    // { id: 'C02K531R1CK', name: 'sensortower-marketing-website-alerts' }
    // { id: 'C02KN72UBGU', name: 'ias-internal' }
    // { id: 'C02KN73Q0BE', name: 'ias-lastrev-external' }
    // { id: 'C02L7641KJP', name: 'office-hours' }
    // { id: 'C02LR4EMDE2', name: 'karmacheck-system-notifications' }
    // { id: 'C02LS7J2YEL', name: 'latest-lrcl-versions' }
    // { id: 'C02UVBG8JDC', name: 'coalition-lastrev-external' }
    // { id: 'C02V2687N58', name: 'coalition-internal' }
    // { id: 'C030J6W9V7V', name: 'broken-prod-build' }
    // { id: 'C03152YAK1R', name: 'webstacks-coalition-lastrev-external' }
    // { id: 'C0345T36X4N', name: 'lastrev-itso' }
    // { id: 'C034CGX758S', name: 'itso-lastrev-external' }
    // { id: 'C035TS2B154', name: 'marqeta-lastrev-external' }
    // { id: 'C036DH8QMUK', name: 'sofi-lastrev-external' }
    // { id: 'C036DHNMG75', name: 'sofi-internal' }
    // { id: 'C038TDKCW7N', name: 'marqeta-internal' }
    // { id: 'C039M8RHC0L', name: 'ts-lr-sys-notification' }
    // { id: 'C03B99PTFRV', name: 'uptime-monitoring' }
    // { id: 'C03CEHLQG0N', name: 'workato-lastrev-external' }
    // { id: 'C03CM7M1YSF', name: 'workato-internal' }
    // { id: 'C03H3R3NA9W', name: 'implementation-team' }
    // { id: 'C03K8PFMJCU', name: 'test-lrfa' }
    // { id: 'C03LSJYD38F', name: '195-places-lr-test' }
    // { id: 'C03M5E9B6TH', name: 'beacon-capital-internal' }
    // { id: 'C03M6V2ETGU', name: 'visual-regression-percy' }
    // { id: 'C03MDE39ET0', name: 'drata-internal' }
    // { id: 'C03MNEFH18U', name: 'beacon-capital-external' }
    // { id: 'C03NY4H2XEJ', name: 'internal-service-desk' }
    // { id: 'C03P7JKG5PD', name: '1pass-internal' }
    // { id: 'C03PA336NA0', name: '1pass-lastrev-external' }
    // { id: 'C03PY9WTF7C', name: 'coalition-builds' }
    // { id: 'C03Q54JBB5Y', name: 'upstatement-lastrev-external' }
    // { id: 'C03TCKNL117', name: 'beacon-builds' }
    // { id: 'C03V8LLQPQA', name: 'permissions' }
    // { id: 'C04AZKN85EK', name: 'new-project-tix' }
    // { id: 'C04BACDU2T0', name: 'shift-lastrev-external' }
    // { id: 'C04BKED69C4', name: 'shift-internal' }
    // { id: 'C04EBBH4X45', name: 'trotto-engineering' }
    // { id: 'C04ERQF0TC1', name: 'gtm' }
    // { id: 'C04HVJWSKFY', name: 'drata-prod-build-failures' }
    // { id: 'C04L6P3RUBD', name: 'security-incidents-internal-only' }
    // { id: 'C04LS9RDM8E', name: 'ai-world' }
    // { id: 'C04NW9W9E6P', name: 'coalition-tickets-external' }
    // { id: 'C04PE71LQ9H', name: 'coal-lr-signup-ext' }
    // { id: 'C04PSNR5CNA', name: 'test-org-channel-owner-initially' }
    // { id: 'C01453XNESC', name: 'if-lastrev-external' }
    // { id: 'C019LE8MW4C', name: 'if-site24x7-web-alerts' }
    // { id: 'C015TQFC0EQ', name: 'dropbox-lms-external' }
    // { id: 'C035G8Z3MN1', name: 'knowledge-project-uat' }
    // { id: 'C03M381F0M9', name: 'soc2-prescient-assurance-external' }
    // { id: 'C03RBPQ9U7P', name: 'trotto-team' }
    await slackClient.initDataLookups();

    for (const channel of Object.values(slackClient.cache.channels)) {
      try {
        if (!channel.cache.info.is_member) {
          // console.error(
          //   `Error indexing Slack messages for channel ${channel.cache.info.name}: Not a member of channel`
          // );
        } else {
          console.time(channel.cache.info.name);
          await indexSingleSlackChannel(channel.id);
          console.timeEnd(channel.cache.info.name);
        }
      } catch (error) {
        console.error(
          `Error indexing Slack messages for channel ${channel.cache.info.name}: ${error}`
        );

        break; // Stop the loop if there is an error
      }
    }
  } catch (error) {
    console.error(`Error: ${error?.response?.data?.message} (${error})`);
  }
};
