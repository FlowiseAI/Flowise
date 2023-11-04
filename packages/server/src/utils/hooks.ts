import { EventEmitter } from 'events'

/**
 * WordPress inspired hooks system.
 *
 * Use via import { addFilter, addAction, hook, filter } from './Hooks'
 * or import { hooks } from './Hooks'
 * and then hooks.addFilter, hooks.addAction, hooks.callHooks
 */

/**
 * Adds a new filter hook.
 *
 * @param name - The name of the filter.
 * @param callback - The callback function to execute when the filter is applied.
 * @param priority - The priority of this filter in relation to other filters. Default is 10.
 *
 * @example
 *
 * addFilter('changeValue', (value) => {
 *     return value * 2;
 * }, 15);
 */
export function addFilter(name: string, callback: (...args: any[]) => void | Promise<void>, priority: number = 10): void {
    hooks.addFilter(name, callback, priority)
}

/**
 * Adds a new action hook.
 *
 * @param name - The name of the action.
 * @param callback - The callback function to execute when the action is applied.
 * @param priority - The priority of this action in relation to other actions. Default is 10.
 *
 * @example
 *
 * addAction('printValue', (value) => {
 *     console.log(value);
 * });
 */
export function addAction(name: string, callback: (...args: any[]) => void | Promise<void>, priority: number = 10): void {
    hooks.addAction(name, callback, priority)
}

/**
 * Calls the hooks associated with the given name and returns the collected results as an array.
 * Null values are filtered out.
 *
 * @param name - The name of the hook (action) to call.
 * @param args - Additional arguments to pass to the hook callbacks.
 * @returns An array of results from the callbacks.
 *
 * @example
 * const finalValue = await hook('changeValue', initialValue);
 */
export async function hook(name: string, ...args: any[]): Promise<any[]> {
    return hooks.callActions(name, ...args)
}

/**
 * Calls the hooks associated with the given name using EventEmitter.emit.
 * Priorities will be respected.
 *
 * @param name - The name of the hook (action) to call.
 * @param args - Additional arguments to pass to the hook callbacks.
 *
 * @example
 * const finalValue = await hook('changeValue', initialValue);
 *
 * @see EventEmitter.emit
 */
export async function emit(name: string, ...args: any[]): Promise<any> {
    return hooks.emit(name, ...args)
}

/**
 * Calls the filter hooks associated with the given name.
 *
 * @param name - The name of the hook (action/filter) to call.
 * @param initial - The initial value to pass to filter hooks.
 * @param args - Additional arguments to pass to the hook callbacks.
 *
 * @example
 *
 * const initialValue = 1;
 * const finalValue = await filter('changeValue', initialValue);
 * console.log(finalValue); // Output depends on added filters
 */
export async function filter(name: string, initial: any = null, ...args: any[]): Promise<any> {
    return hooks.applyFilters(name, initial, ...args)
}

type PriorityCallback<T = any> = {
    callback: (initial: T, ...args: any[]) => T | Promise<T>
    priority: number
}

/**
 * WordPress inspired hooks system, extending node EventEmitter.
 * It defines two types of hooks: actions and filters.
 *
 * **Actions** are simple callbacks that are called when the hook is called.
 * - They can be added with `addAction`
 * - They work similarly to EventEmitter's or CustomEvents but extend the functionality by introducing priorities.
 * - Callback functions can by async functions and may be passed additional arguments.
 *
 * **Filters** are extended callbacks that can manipulate the initial value by returning it.
 * - They can be added with `addFilter`
 * - Filter callback functions get the initial value as first argument and must return the (manipulated) value.
 *
 * **Priority** is an optional last parameter for both actions and filters, to define the order in which the callbacks are called.
 * - Lower numbers correspond with earlier execution.
 * - The priority must be a positive integer number, and should be typically in the range of 0 .. 20, and not higher than 99.
 * - The default priority is 10
 * - If two callbacks have the same priority, the one that was added first is executed first.
 *
 * **Naming** of hooks is important, as it is used to identify the hook.
 * - Names may be any string. They should be easy to understand, but not too generic to avoid conflicts.
 * - It's a good practice to prefix them with a namespace (could be the package or class name, or similar)
 *   name, e.g. `mypackage:initapp`, `mypackage:ClassName:initialize`, ...
 * - [!WARNING] You should not use the same name for actions and filters.
 *
 * @see https://developer.wordpress.org/plugins/hooks/
 * @extends EventEmitter
 */
class Hooks extends EventEmitter {
    private callbacks: Map<string, PriorityCallback[]> = new Map()

    constructor() {
        super()
    }

    private addHook<T>(name: string, callback: (initial: T, ...args: any[]) => T | Promise<T>, priority: number): void {
        // Check if priority is a positive integer
        if (!Number.isInteger(priority) || priority < 0) {
            throw new Error('Priority must be a positive integer.')
        }

        const newHandler: PriorityCallback<T> = { callback, priority }
        const handlers = this.callbacks.get(name) ?? []

        // Remove all existing callbacks from EventEmitter listeners with for the event name
        for (const { callback } of handlers) {
            this.removeListener(name, callback)
        }

        // Add and sort PriorityCallback by priority
        handlers.push(newHandler)
        handlers.sort((a, b) => a.priority - b.priority)
        this.callbacks.set(name, handlers)

        // Synchronize with EventEmitter's listener array
        for (const { callback } of handlers) {
            this.addListener(name, callback)
        }
    }

    /**
     * Wrapper for EventEmitter.on
     *
     * @param name will be used as the event name
     * @param callback will be used as the listener function
     * @param priority will be used as the priority
     */
    public addAction<T>(name: string, callback: (...args: any[]) => T | Promise<T>, priority: number = 10): this {
        this.addHook(name, callback, priority)
        return this
    }
    public on = this.addAction

    /**
     * Async alternative to EventEmitter.emit that collects all return values of the callbacks.
     *
     * @param name will be used as the event name
     * @param callback will be used as the listener function
     */
    public async callActions<T>(name: string, ...args: any[]): Promise<T[]> {
        let results = []
        const actions = this.listeners(name)
        for (const action of actions) {
            const result = await action(...args)
            if (result != null) {
                results.push(result)
            }
        }
        return results
    }

    /**
     * Wrapper for EventEmitter.on
     *
     * @param name will be used as the event name
     * @param callback will be used as the listener function, which uses the first argument as the initial.
     * @param priority will be used as the priority
     */
    public addFilter<T>(name: string, callback: (initial: T, ...args: any[]) => T | Promise<T>, priority: number = 10): this {
        this.addHook(name, callback, priority)
        return this
    }

    /**
     * Calls all filter callbacks and returns the manipulated value.
     *
     * @param name will be used as the event name
     * @param initial initial value, that can be manipulated by the filter callbacks by returning it
     * @param args additional arguments that will be passed to the filter callbacks
     * @returns manipulated value or null
     */
    public async applyFilters<T>(name: string, initial: T, ...args: any[]): Promise<T> {
        let result = initial
        const filters = this.listeners(name)
        for (const filter of filters) {
            const newResult = await filter(result, ...args)
            if (newResult != null) {
                result = newResult
            }
        }
        return result
    }

    public call = this.callActions
    public filter = this.applyFilters
}

// Singleton Instance
export const hooks = new Hooks()
