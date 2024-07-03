const summaryReport = {
    name: 'summaryReport',
    description: 'Creates a CSV file of all of the fields the user wants to see in a report.',
    sourceContentTypeId: 'article',
    reportDataFields: ['sys.id', 'fields.title', 'fields.slug', 'fields.glossaryTerms'],
    filters: {
        'sys.id[in]': [
            "kA03k0000003lj3CAA_en_US_3",
            "kA03k0000003lj8CAA_en_US_3",
            "kA03k000000oanRCAQ_en_US_3",
            "kA03k0000003ljDCAQ_en_US_3",
            "kA03k0000003lioCAA_en_US_3",
            "kA03k000000oZF4CAM_en_US_3",
            "kA03k000000oZ7uCAE_en_US_3",
            "kA03k000000oZLaCAM_en_US_3",
            "kA03k000000oanMCAQ_en_US_3",
            "kA03k0000005ym9CAA_en_US_3",
            "kA03k000000oZ8DCAU_en_US_3",
            "kA03k0000003lmlCAA_en_US_3",
            "kA03k000000oZLGCA2_en_US_3",
            "17eGBDtEMqsZNeVKy4iDE0",
            "3m8m9xlM8HzQRjK0NLkIT0",
            "kA03k000000oaevCAA_en_US_3",
            "kA03k0000003ljNCAQ_en_US_3",
            "kA03k000000Vr3SCAS_en_US_3",
            "kA03k0000003ljSCAQ_en_US_3",
            "kA03k000000oZHiCAM_en_US_3",
            "kA03k000000oZ8gCAE_en_US_3",
            "kA03k000000VraRCAS_en_US_3",
            "kA03k000000VrEaCAK_en_US_3",
            "kA03k000000oZLfCAM_en_US_3",
            "kA03k000000Vr38CAC_en_US_3"
        ]
    }
}

module.exports = summaryReport
