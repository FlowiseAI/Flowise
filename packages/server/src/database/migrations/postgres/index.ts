import { Init1693891895163 } from './1693891895163-Init'
import { ModifyChatFlow1693995626941 } from './1693995626941-ModifyChatFlow'
import { ModifyChatMessage1693996694528 } from './1693996694528-ModifyChatMessage'
import { ModifyCredential1693997070000 } from './1693997070000-ModifyCredential'
import { ModifyTool1693997339912 } from './1693997339912-ModifyTool'
import { AddApiConfig1694099183389 } from './1694099183389-AddApiConfig'
import { AddAnalytic1694432361423 } from './1694432361423-AddAnalytic'
import { AddChatHistory1694658756136 } from './1694658756136-AddChatHistory'
import { AddAssistantEntity1699325775451 } from './1699325775451-AddAssistantEntity'
import { AddUsedToolsToChatMessage1699481607341 } from './1699481607341-AddUsedToolsToChatMessage'
import { AddCategoryToChatFlow1699900910291 } from './1699900910291-AddCategoryToChatFlow'
import { AddFileAnnotationsToChatMessage1700271021237 } from './1700271021237-AddFileAnnotationsToChatMessage'
import { AddFileUploadsToChatMessage1701788586491 } from './1701788586491-AddFileUploadsToChatMessage'
import { AddVariableEntity1699325775451 } from './1702200925471-AddVariableEntity'
import { AddSpeechToText1706364937060 } from './1706364937060-AddSpeechToText'
import { AddFeedback1707213601923 } from './1707213601923-AddFeedback'
import { AddUpsertHistoryEntity1709814301358 } from './1709814301358-AddUpsertHistoryEntity'
import { FieldTypes1710497452584 } from './1710497452584-FieldTypes'
import { AddLead1710832137905 } from './1710832137905-AddLead'
import { AddLeadToChatMessage1711538016098 } from './1711538016098-AddLeadToChatMessage'
import { AddVectorStoreConfigToDocStore1715861032479 } from './1715861032479-AddVectorStoreConfigToDocStore'
import { AddDocumentStore1711637331047 } from './1711637331047-AddDocumentStore'
import { AddAgentReasoningToChatMessage1714679514451 } from './1714679514451-AddAgentReasoningToChatMessage'
import { AddTypeToChatFlow1716300000000 } from './1716300000000-AddTypeToChatFlow'
import { AddApiKey1720230151480 } from './1720230151480-AddApiKey'
import { AddActionToChatMessage1721078251523 } from './1721078251523-AddActionToChatMessage'
import { AddAnswersConfig1714692854264 } from './1714692854264-AddAnswersConfig'
import { AddUser1716422641414 } from './1716422641414-AddUser'
import { AddOrganizationId1717629010538 } from './1717629010538-AddOrganizationId'
import { AddOrganization1717632419096 } from './1717632419096-AddOrganization'
import { UpdateDefaultVisibility1717684633931 } from './1717684633931-UpdateDefaultVisibility'
import { AddUserId1717773329048 } from './1717773329048-AddUserId'
import { UpdateChatflowToHaveParentId1717796909629 } from './1717796909629-UpdateChatflowToHaveParentId'
import { UpdateVisibilityType1719248473069 } from './1719248473069-UpdateVisibilityType'
import { CredentialsVisibility1721247848452 } from './1721247848452-CredentialsVisibility'
import { AddDescriptionToChatFlow1722099922876 } from './1722101786123-AddDescriptionToChatflow'
import { AddSoftDeleteChatflows1724275570313 } from './1724275570313-AddSoftDeleteChatflows'
import { VariablesVisibility1725494523908 } from './1725494523908-VariablesVisibility'
import { AddPlans1722954481004 } from './1722954481003-AddPlans'
import { ApiKeysUserAndOrg1727817692110 } from './1727817692110-ApiKeysUserAndOrg'
import { ToolVisibility1730491825527 } from './1730491825527-ToolVisibility'
import { AddChat1732145631409 } from './1732145631409-AddChat'
import { ApiKeyEnhancement1720230151481 } from './1720230151481-ApiKeyEnhancement'
import { AddStripeCustomerId1734126321905 } from './1734126321905-AddStripeCustomerId'
import { BillingSchemaEnhancement1740447708857 } from './1740447708857-BillingSchemaEnhancement'
import { BilingOrganization1740859194641 } from './1740859194641-BilingOrganization'
import { AddCustomTemplate1725629836652 } from './1725629836652-AddCustomTemplate'
import { AddArtifactsToChatMessage1726156258465 } from './1726156258465-AddArtifactsToChatMessage'
import { AddFollowUpPrompts1726666309552 } from './1726666309552-AddFollowUpPrompts'
import { AddTypeToAssistant1733011290987 } from './1733011290987-AddTypeToAssistant'
import { UpdateUserUniqueAuth0Id1741898609435 } from './1741898609435-UpdateUserUniqueAuth0Id'
import { AppCsvRuns1744553414309 } from './1744553414309-AddAppCsvRuns'
import { AddBrowserExtConfig1746508019300 } from './1746508019300-AddBrowserExtConfig'
import { AddDefaultChatflowIdToUser1746508019301 } from './1746508019301-AddDefaultChatflowIdToUser'
import { AddExecutionEntity1738090872625 } from './1738090872625-AddExecutionEntity'
import { AddUserScopingToExecution1738091000000 } from './1738091000000-AddUserScopingToExecution'
import { AddPgvectorExtension1752614575000 } from './1752614575000-AddPgvectorExtension'

export const postgresMigrations = [
    Init1693891895163,
    ModifyChatFlow1693995626941,
    ModifyChatMessage1693996694528,
    ModifyCredential1693997070000,
    ModifyTool1693997339912,
    AddApiConfig1694099183389,
    AddAnalytic1694432361423,
    AddChatHistory1694658756136,
    AddAssistantEntity1699325775451,
    AddUsedToolsToChatMessage1699481607341,
    AddCategoryToChatFlow1699900910291,
    AddFileAnnotationsToChatMessage1700271021237,
    AddVariableEntity1699325775451,
    AddFileUploadsToChatMessage1701788586491,
    AddSpeechToText1706364937060,
    AddUpsertHistoryEntity1709814301358,
    AddFeedback1707213601923,
    FieldTypes1710497452584,
    AddAnswersConfig1714692854264,
    AddUser1716422641414,
    AddDocumentStore1711637331047,
    AddLead1710832137905,
    AddLeadToChatMessage1711538016098,
    AddAgentReasoningToChatMessage1714679514451,
    AddTypeToChatFlow1716300000000,
    AddVectorStoreConfigToDocStore1715861032479,
    AddApiKey1720230151480,
    ApiKeyEnhancement1720230151481,
    AddActionToChatMessage1721078251523,
    AddOrganizationId1717629010538,
    AddOrganization1717632419096,
    UpdateDefaultVisibility1717684633931,
    AddUserId1717773329048,
    UpdateChatflowToHaveParentId1717796909629,
    UpdateVisibilityType1719248473069,
    CredentialsVisibility1721247848452,
    AddDescriptionToChatFlow1722099922876,
    AddSoftDeleteChatflows1724275570313,
    VariablesVisibility1725494523908,
    AddPlans1722954481004,
    ApiKeysUserAndOrg1727817692110,
    ToolVisibility1730491825527,
    AddChat1732145631409,
    AddStripeCustomerId1734126321905,
    BillingSchemaEnhancement1740447708857,
    BilingOrganization1740859194641,
    AddCustomTemplate1725629836652,
    AddArtifactsToChatMessage1726156258465,
    AddFollowUpPrompts1726666309552,
    AddTypeToAssistant1733011290987,
    UpdateUserUniqueAuth0Id1741898609435,
    AppCsvRuns1744553414309,
    AddBrowserExtConfig1746508019300,
    AddExecutionEntity1738090872625,
    AddUserScopingToExecution1738091000000,
    AddDefaultChatflowIdToUser1746508019301,
    AddPgvectorExtension1752614575000
]
