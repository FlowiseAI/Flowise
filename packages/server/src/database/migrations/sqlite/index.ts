import { Init1693835579790 } from './1693835579790-Init'
import { ModifyChatFlow1693920824108 } from './1693920824108-ModifyChatFlow'
import { ModifyChatMessage1693921865247 } from './1693921865247-ModifyChatMessage'
import { ModifyCredential1693923551694 } from './1693923551694-ModifyCredential'
import { ModifyTool1693924207475 } from './1693924207475-ModifyTool'
import { AddApiConfig1694090982460 } from './1694090982460-AddApiConfig'
import { AddAnalytic1694432361423 } from './1694432361423-AddAnalytic'
import { AddChatHistory1694657778173 } from './1694657778173-AddChatHistory'
import { AddAssistantEntity1699325775451 } from './1699325775451-AddAssistantEntity'
import { AddUsedToolsToChatMessage1699481607341 } from './1699481607341-AddUsedToolsToChatMessage'
import { AddCategoryToChatFlow1699900910291 } from './1699900910291-AddCategoryToChatFlow'
import { AddFileAnnotationsToChatMessage1700271021237 } from './1700271021237-AddFileAnnotationsToChatMessage'
import { AddFileUploadsToChatMessage1701788586491 } from './1701788586491-AddFileUploadsToChatMessage'
import { AddVariableEntity1699325775451 } from './1702200925471-AddVariableEntity'
import { AddSpeechToText1706364937060 } from './1706364937060-AddSpeechToText'
import { AddFeedback1707213619308 } from './1707213619308-AddFeedback'
import { AddUpsertHistoryEntity1709814301358 } from './1709814301358-AddUpsertHistoryEntity'
import { AddLead1710832117612 } from './1710832117612-AddLead'
import { AddLeadToChatMessage1711537986113 } from './1711537986113-AddLeadToChatMessage'
import { AddDocumentStore1711637331047 } from './1711637331047-AddDocumentStore'
import { AddEvaluation1714548873039 } from './1714548873039-AddEvaluation'
import { AddDatasets1714548903384 } from './1714548903384-AddDataset'
import { AddAgentReasoningToChatMessage1714679514451 } from './1714679514451-AddAgentReasoningToChatMessage'
import { AddEvaluator1714808591644 } from './1714808591644-AddEvaluator'
import { AddVectorStoreConfigToDocStore1715861032479 } from './1715861032479-AddVectorStoreConfigToDocStore'
import { AddTypeToChatFlow1716300000000 } from './1716300000000-AddTypeToChatFlow'
import { AddApiKey1720230151480 } from './1720230151480-AddApiKey'
import { AddActionToChatMessage1721078251523 } from './1721078251523-AddActionToChatMessage'
import { AddCustomTemplate1725629836652 } from './1725629836652-AddCustomTemplate'
import { AddArtifactsToChatMessage1726156258465 } from './1726156258465-AddArtifactsToChatMessage'
import { AddFollowUpPrompts1726666294213 } from './1726666294213-AddFollowUpPrompts'
import { AddTypeToAssistant1733011290987 } from './1733011290987-AddTypeToAssistant'
import { AddSeqNoToDatasetRow1733752119696 } from './1733752119696-AddSeqNoToDatasetRow'
import { AddExecutionEntity1738090872625 } from './1738090872625-AddExecutionEntity'
import { FixOpenSourceAssistantTable1743758056188 } from './1743758056188-FixOpenSourceAssistantTable'
import { AddErrorToEvaluationRun1744964560174 } from './1744964560174-AddErrorToEvaluationRun'
import { AddTextToSpeechToChatFlow1754986486669 } from './1754986486669-AddTextToSpeechToChatFlow'
import { ModifyChatflowType1755066758601 } from './1755066758601-ModifyChatflowType'
import { AddTextToSpeechToChatFlow1759419136055 } from './1759419136055-AddTextToSpeechToChatFlow'
import { AddChatFlowNameIndex1759424923093 } from './1759424923093-AddChatFlowNameIndex'

import { AddAuthTables1720230151482 } from '../../../enterprise/database/migrations/sqlite/1720230151482-AddAuthTables'
import { AddWorkspace1720230151484 } from '../../../enterprise/database/migrations/sqlite/1720230151484-AddWorkspace'
import { AddWorkspaceShared1726654922034 } from '../../../enterprise/database/migrations/sqlite/1726654922034-AddWorkspaceShared'
import { AddWorkspaceIdToCustomTemplate1726655750383 } from '../../../enterprise/database/migrations/sqlite/1726655750383-AddWorkspaceIdToCustomTemplate'
import { AddOrganization1727798417345 } from '../../../enterprise/database/migrations/sqlite/1727798417345-AddOrganization'
import { LinkWorkspaceId1729130948686 } from '../../../enterprise/database/migrations/sqlite/1729130948686-LinkWorkspaceId'
import { LinkOrganizationId1729133111652 } from '../../../enterprise/database/migrations/sqlite/1729133111652-LinkOrganizationId'
import { AddSSOColumns1730519457880 } from '../../../enterprise/database/migrations/sqlite/1730519457880-AddSSOColumns'
import { AddPersonalWorkspace1734074497540 } from '../../../enterprise/database/migrations/sqlite/1734074497540-AddPersonalWorkspace'
import { RefactorEnterpriseDatabase1737076223692 } from '../../../enterprise/database/migrations/sqlite/1737076223692-RefactorEnterpriseDatabase'
import { ExecutionLinkWorkspaceId1746862866554 } from '../../../enterprise/database/migrations/sqlite/1746862866554-ExecutionLinkWorkspaceId'

export const sqliteMigrations = [
    Init1693835579790,
    ModifyChatFlow1693920824108,
    ModifyChatMessage1693921865247,
    ModifyCredential1693923551694,
    ModifyTool1693924207475,
    AddApiConfig1694090982460,
    AddAnalytic1694432361423,
    AddChatHistory1694657778173,
    AddAssistantEntity1699325775451,
    AddUsedToolsToChatMessage1699481607341,
    AddCategoryToChatFlow1699900910291,
    AddFileAnnotationsToChatMessage1700271021237,
    AddVariableEntity1699325775451,
    AddFileUploadsToChatMessage1701788586491,
    AddSpeechToText1706364937060,
    AddUpsertHistoryEntity1709814301358,
    AddEvaluation1714548873039,
    AddDatasets1714548903384,
    AddEvaluator1714808591644,
    AddFeedback1707213619308,
    AddDocumentStore1711637331047,
    AddLead1710832117612,
    AddLeadToChatMessage1711537986113,
    AddAgentReasoningToChatMessage1714679514451,
    AddVectorStoreConfigToDocStore1715861032479,
    AddTypeToChatFlow1716300000000,
    AddApiKey1720230151480,
    AddActionToChatMessage1721078251523,
    AddArtifactsToChatMessage1726156258465,
    AddFollowUpPrompts1726666294213,
    AddTypeToAssistant1733011290987,
    AddCustomTemplate1725629836652,
    AddAuthTables1720230151482,
    AddWorkspace1720230151484,
    AddWorkspaceShared1726654922034,
    AddWorkspaceIdToCustomTemplate1726655750383,
    AddOrganization1727798417345,
    LinkWorkspaceId1729130948686,
    LinkOrganizationId1729133111652,
    AddSSOColumns1730519457880,
    AddSeqNoToDatasetRow1733752119696,
    AddPersonalWorkspace1734074497540,
    RefactorEnterpriseDatabase1737076223692,
    AddExecutionEntity1738090872625,
    FixOpenSourceAssistantTable1743758056188,
    AddErrorToEvaluationRun1744964560174,
    ExecutionLinkWorkspaceId1746862866554,
    AddTextToSpeechToChatFlow1754986486669,
    ModifyChatflowType1755066758601,
    AddTextToSpeechToChatFlow1759419136055,
    AddChatFlowNameIndex1759424923093
]
