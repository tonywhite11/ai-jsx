/**
 * This module provides the core completion components for AI.JSX.
 * @packageDocumentation
 */

import * as AI from '../index.js';
import { Node, Component, RenderContext } from '../index.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { OpenAIChatModel, OpenAICompletionModel } from '../lib/openai.js';
import { getEnvVar } from '../lib/util.js';

/**
 * Represents properties passed to a given Large Language Model.
 */
export interface ModelProps {
  /** The temperature to use for LLM calls. */
  temperature?: number;
  /** The maximum number of tokens to generate. */
  maxTokens?: number;
  /** A list of stop tokens. */
  stop?: string[];
}

/**
 * Represents a {@link ModelProps} with child @{link Node}s.
 */
export type ModelPropsWithChildren = ModelProps & {
  children: Node;
};

/**
 * A Component that invokes a Large Language Model.
 */
export type ModelComponent<T extends ModelPropsWithChildren> = Component<T>;

/**
 * Represents a function definition that can be invoked using the {@link FunctionCall} component.
 */
export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, FunctionParameter>;
}

/**
 * Represents parameters to a {@link FunctionDefinition}.
 */
export interface FunctionParameter {
  description?: string;
  type?: string;
  required: boolean;
}

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI as the completion model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticCompletionModel({ children, ...props }: ModelPropsWithChildren) {
  if (getEnvVar('OPENAI_API_KEY', false) || getEnvVar('OPENAI_API_BASE', false)) {
    return (
      <OpenAICompletionModel model="text-davinci-003" {...props}>
        {children}
      </OpenAICompletionModel>
    );
  }

  throw new AIJSXError(
    `No completion model was specified. To fix this, do one of the following:
    
1. Set the OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY environment variable.
2. Set the OPENAI_API_BASE or REACT_APP_OPENAI_API_BASE environment variable.
3. use an explicit CompletionProvider component.`,
    ErrorCode.MissingCompletionModel,
    'user'
  );
}

/**
 * If env var `OPENAI_API_KEY` is defined, use Open AI as the chat model provider.
 *
 * This is internal and users should not need to access this directly.
 */
function AutomaticChatModel({ children, ...props }: ModelPropsWithChildren) {
  if (getEnvVar('OPENAI_API_KEY', false) || getEnvVar('OPENAI_API_BASE', false)) {
    return (
      <OpenAIChatModel model="gpt-3.5-turbo" {...props}>
        {children}
      </OpenAIChatModel>
    );
  }
  throw new AIJSXError(
    `No chat model was specified. To fix this, do one of the following:
    
1. Set the OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY environment variable.
2. Set the OPENAI_API_BASE or REACT_APP_OPENAI_API_BASE environment variable.
3. use an explicit ChatProvider component.`,
    ErrorCode.MissingChatModel,
    'user'
  );
}

/** The default context used by {@link CompletionProvider}. */
const completionContext = AI.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([
  AutomaticCompletionModel,
  {},
]);

/**
 * A CompletionProvider is used by {@link ChatCompletion} to access an underlying Large Language Model.
 */
export function CompletionProvider<T extends ModelPropsWithChildren>(
  { component, children, ...newDefaults }: { component?: ModelComponent<T> } & T,
  { getContext }: RenderContext
) {
  const [existingComponent, previousDefaults] = getContext(completionContext);
  return (
    <completionContext.Provider
      value={[
        (component ?? existingComponent) as ModelComponent<ModelPropsWithChildren>,
        { ...previousDefaults, ...newDefaults },
      ]}
    >
      {children}
    </completionContext.Provider>
  );
}

/** The default context used by {@link ChatProvider}. */
const chatContext = AI.createContext<[ModelComponent<ModelPropsWithChildren>, ModelProps]>([AutomaticChatModel, {}]);

/**
 * A ChatProvider is used by {@link ChatCompletion} to access an underlying Large Language Model.
 */
export function ChatProvider<T extends ModelPropsWithChildren>(
  { component, children, ...newDefaults }: { component?: ModelComponent<T> } & T,
  { getContext }: RenderContext
) {
  const [existingComponent, previousDefaults] = getContext(chatContext);
  return (
    <chatContext.Provider
      value={[
        (component ?? existingComponent) as ModelComponent<ModelPropsWithChildren>,
        { ...previousDefaults, ...newDefaults },
      ]}
    >
      {children}
    </chatContext.Provider>
  );
}

/**
 * Provide a System Message to the LLM, for use within a {@link ChatCompletion}.
 *
 * The system message can be used to put the model in character. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <SystemMessage>You are a helpful customer service agent.</SystemMessage>
 *    </ChatCompletion>
 * ```
 */
export function SystemMessage({ children }: { children: Node }) {
  return children;
}

/**
 * Provide a User Message to the LLM, for use within a {@link ChatCompletion}.
 *
 * The user message tells the model what the user has said. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>I'd like to cancel my account.</UserMessage>
 *    </ChatCompletion>
 *
 *    ==> 'Sorry to hear that. Can you tell me why?
 * ```
 */
export function UserMessage({ children }: { name?: string; children: Node }) {
  return children;
}

/**
 * Provide an Assistant Message to the LLM, for use within a {@link ChatCompletion}.
 *
 * The assistant message tells the model what it has previously said. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>I'd like to cancel my account.</UserMessage>
 *      <AssistantMessage>Sorry to hear that. Can you tell me why?</AssistantMessage>
 *      <UserMessage>It's too expensive.</UserMessage>
 *    </ChatCompletion>
 * ```
 *
 *    ==> "Ok, thanks for that feedback. I'll cancel your account."
 */
export function AssistantMessage({ children }: { children: Node }) {
  return children;
}

/**
 * Provide a function call to the LLM, for use within a {@link ChatCompletion}.
 *
 * The function call tells the model that a function was previously invoked by the model. See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 * When the model returns a function call, @{link ChatCompletion} returns a @{link FunctionCall} component.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>What is 258 * 322?</UserMessage>
 *      <FunctionCall name="evaluate_math" args={expression: "258 * 322"} />
 *      <FunctionResponse name="evaluate_math">83076</FunctionResponse>
 *    </ChatCompletion>
 *
 *    ==> "That would be 83,076."
 * ```
 */
export function FunctionCall({ name, args }: { name: string; args: Record<string, string | number | boolean | null> }) {
  return `Call function ${name} with ${JSON.stringify(args)}`;
}

/**
 * Renders to the output of a previous {@link FunctionCall} component, for use within a {@link ChatCompletion}.
 *
 * See https://platform.openai.com/docs/guides/gpt/chat-completions-api for more detail.
 *
 * @example
 * ```tsx
 *    <ChatCompletion>
 *      <UserMessage>What is 258 * 322?</UserMessage>
 *      <FunctionCall name="evaluate_math" args={expression: "258 * 322"} />
 *      <FunctionResponse name="evaluate_math">83076</FunctionResponse>
 *    </ChatCompletion>
 *
 *    ==> "That would be 83,076."
 * ```
 */
export async function FunctionResponse(
  { name, children }: { name: string; children: Node },
  { render }: AI.ComponentContext
) {
  const output = await render(children);
  return `function ${name} returns ${output}`;
}

/**
 * Perform a Large Language Mokdel call to do a [completion](https://platform.openai.com/docs/guides/gpt/completions-api).
 *
 * In general, you should prefer to use {@link ChatCompletion} instead of {@link Completion}, because {@link ChatCompletion} uses better models.
 *
 * @example
 * ```tsx
 *    <Completion>
 *      Here's a list of three dog names:
 *    </Completion>
 *
 *    ==> 'Dottie, Murphy, Lucy'
 * ```
 */
export function Completion(
  { children, ...props }: ModelPropsWithChildren & Record<string, unknown>,
  { getContext }: RenderContext
) {
  const [CompletionComponent, defaultProps] = getContext(completionContext);
  return (
    <CompletionComponent {...defaultProps} {...props}>
      {children}
    </CompletionComponent>
  );
}

/**
 * Perform a Large Language Model call to do [chat completion](https://platform.openai.com/docs/guides/gpt/chat-completions-api).
 *
 * Every child of {@link ChatCompletion} must something that renders to a {@link SystemMessage}, {@link UserMessage}, or {@link AssistantMessage}.
 *
 * @example
 * ```tsx
 *    function MyUserMessage() {
 *     return <UserMessage>Hi, I'm a user message.</UserMessage>;
 *    }
 *
 *    <ChatCompletion>
 *      <SystemMessage>You are a nice person.</SystemMessage>
 *      <MyUserMessage />
 *    </ChatCompletion>
 * ```
 */
export function ChatCompletion(
  { children, ...props }: ModelPropsWithChildren & Record<string, unknown>,
  { getContext }: RenderContext
) {
  const [ChatComponent, defaultProps] = getContext(chatContext);
  return (
    <ChatComponent {...defaultProps} {...props}>
      {children}
    </ChatComponent>
  );
}
