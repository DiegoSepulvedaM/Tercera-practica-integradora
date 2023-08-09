export interface Frame {
  function?: string;
  module: string;
  filename: string;
  abs_path: string;
  lineno: number;
  pre_context: string[];
  context_line: string;
  post_context: string[];
  in_app: boolean;
  vars: {
    [propName: string]: string;
  };
}

export interface SentryRequest {
  id: number;
  project: string;
  project_slug: string;
  url: string;
  logger?: string;
  level: string;
  culprit: string;
  message: string;
  triggering_rules: [];
  event: {
    event_id: string;
    level: string;
    version: string;
    type: string;
    logentry: {
      formatted: string;
      message?: string;
      params?: object;
    };
    logger: string;
    modules: {
      [propName: string]: string;
    };
    platform: string;
    timestamp: number;
    received: number;
    environment: string;
    user: {
      id: string;
      email: string;
      ip_address: string;
      username: string;
      name: string;
      geo: {
        country_code: string;
        city: string;
        region: string;
      };
    };
    request: {
      url: string;
      method: string;
      data: object;
      query_string: string[][];
      cookies: string[][];
      headers: string[][];
      env: {
        [propName: string]: string;
      };
      inferred_content_type: string;
      api_target?: string;
      fragment?: string;
    };
    contexts: {
      [propName: string]: [];
    };
    exeption: {
      values: {
        frames: Frame[];
      }[];
    };
    stacktrace: {
      frames: Frame[];
    };
    tags: [][];
    extra: {
      emptyList: [];
      emptyMap: object;
      length: number;
      results: [][];
      session: object[];
      unauthorized: false;
      url: string;
    };
    fingerprint: string[];
    hashes: string[];
    culprit: string;
    metadata: {
      [propName: string]: string;
    };
    title: string;
    location?: string;
    _ref: number;
    _ref_version: number;
    _metrics: {
      [propName: string]: number | string;
    };
    nodestore_insert: number;
    id: string;
  };
}
