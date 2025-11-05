import { TextLoader } from 'langchain/document_loaders/fs/text'
import Papa from 'papaparse'

type CSVLoaderOptions = {
    // Return specific column from key (string) or index (integer)
    column?: string | number
    // Force separator (default: auto detect)
    separator?: string
}

/**
 * A class that extends the TextLoader class. It represents a document
 * loader that loads documents from a CSV file. It has a constructor that
 * takes a `filePathOrBlob` parameter representing the path to the CSV
 * file or a Blob object, and an optional `options` parameter of type
 * `CSVLoaderOptions` or a string representing the column to use as the
 * document's pageContent.
 */
export class CSVLoader extends TextLoader {
    protected options: CSVLoaderOptions = {}

    constructor(filePathOrBlob: ConstructorParameters<typeof TextLoader>[0], options?: CSVLoaderOptions | string) {
        super(filePathOrBlob)

        if (typeof options === 'string') {
            this.options = { column: options }
        } else {
            this.options = options ?? this.options
        }
    }
    /**
     * A protected method that parses the raw CSV data and returns an array of
     * strings representing the pageContent of each document. It uses the
     * `papaparse` to parse the CSV data. If
     * the `column` option is specified, it checks if the column exists in the
     * CSV file and returns the values of that column as the pageContent. If
     * the `column` option is not specified, it converts each row of the CSV
     * data into key/value pairs and joins them with newline characters.
     * @param raw The raw CSV data to be parsed.
     * @returns An array of strings representing the pageContent of each document.
     */
    async parse(raw: string): Promise<string[]> {
        const { column, separator } = this.options

        const {
            data: parsed,
            meta: { fields = [] }
        } = Papa.parse<{ [K: string]: string }>(raw.trim(), {
            delimiter: separator,
            header: true
        })

        if (column !== undefined) {
            if (!fields.length) {
                throw new Error(`Unable to resolve fields from header.`)
            }

            let searchIdx = column

            if (typeof column == 'number') {
                searchIdx = fields[column]
            }

            if (!fields.includes(searchIdx as string)) {
                throw new Error(`Column ${column} not found in CSV file.`)
            }

            // Note TextLoader will raise an exception if the value is null.
            return parsed.map((row) => row[searchIdx])
        }

        return parsed.map((row) => fields.map((key) => `${key.trim() || '_0'}: ${row[key]?.trim()}`).join('\n'))
    }
}
