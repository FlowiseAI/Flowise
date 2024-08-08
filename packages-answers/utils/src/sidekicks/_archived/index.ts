import { Sidekick } from 'types'
import accountManager from './accountManager'
import blog from './blog'
import coding from './coding'
import contentful from './contentful'
import debugging from './debugging'
import defaultPrompt from './defaultPrompt'
import docs from './docs'
import gptraw from './gptraw'
import legal from './legal'
import usecaseWritingExpert from './usecaseWritingExpert'
import productmanager from './productmanager'
import project from './project'
import promptCreator from './promptCreator'
import realtorListing from './realtorListing'
import refactor from './refactor'
import research from './research'
import sales from './sales'
import support from './support'
import teacher from './teacher'
import salesOutboundEmail from './salesOutboundEmail'
import meetingAnalysisReplyExpert from './meetingAnalysisReplyExpert'
import investorOutboundEmail from './investorOutboundEmail'
import landingPageCreator from './landingPageCreator'
import planMyWeek from './planMyWeek'
import salesEmailCritic from './salesEmailCritic'
import brainstormEmailSubject from './brainstormEmailSubject'
import contentfulContent from './contentfulContent'
import rootCauseAnalysis from './rootCauseAnalysis'
import engineeringDocsApi from './engineeringDocsApi'
import engineeringQA from './engineeringQA'
import blogOutlineExpert from './blogOutlineExpert'
import prfaqCreator from './prfaqCreator'
import imageGenerator from './imageGenerator'
import imageConceptGenerator from './imageConceptGenerator'
import decisionMaking from './decisionMaking'
import tiktokScriptWriter from './tiktokScriptWriter'
import sidekickHelper from './sidekickHelper'
import engineeringPRCreator from './engineeringPRCreator'
import productUserStories from './productUserStories'
import meetingAnalysis from './meetingAnalysis'
import executiveSummary from './executiveSummary'
import blogCritic from './blogCritic'

export const sidekicks: Sidekick[] = [
    accountManager,
    blog,
    coding,
    contentful,
    debugging,
    defaultPrompt,
    docs,
    gptraw,
    legal,
    usecaseWritingExpert,
    productmanager,
    project,
    promptCreator,
    realtorListing,
    refactor,
    research,
    sales,
    support,
    teacher,
    salesOutboundEmail,
    meetingAnalysisReplyExpert,
    investorOutboundEmail,
    planMyWeek,
    salesEmailCritic,
    brainstormEmailSubject,
    contentfulContent,
    rootCauseAnalysis,
    engineeringDocsApi,
    engineeringQA,
    blogOutlineExpert,
    prfaqCreator,
    imageGenerator,
    imageConceptGenerator,
    decisionMaking,
    tiktokScriptWriter,
    sidekickHelper,
    landingPageCreator,
    engineeringPRCreator,
    productUserStories,
    meetingAnalysis,
    executiveSummary,
    blogCritic
    // Add more prompts here
]

// sidekicks.forEach((sidekick) => {
//   console.log(`${sidekick.label} - ${sidekick.placeholder}`);
// });
