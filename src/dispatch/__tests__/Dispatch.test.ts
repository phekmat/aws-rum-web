import { Dispatch } from '../Dispatch';
import * as Utils from '../../test-utils/test-utils';
import { DataPlaneClient } from '../DataPlaneClient';
import { CredentialProvider } from '@aws-sdk/types';
import { defaultConfig } from '../../orchestration/Orchestration';

const sendFetch = jest.fn(() => Promise.resolve());
const sendBeacon = jest.fn(() => Promise.resolve());
jest.mock('../DataPlaneClient', () => ({
    DataPlaneClient: jest
        .fn()
        .mockImplementation(() => ({ sendFetch, sendBeacon }))
}));

const APPLICATION_ID = 'abc123';

describe('Dispatch tests', () => {
    beforeEach(() => {
        sendFetch.mockClear();
        sendBeacon.mockClear();

        // @ts-ignore
        DataPlaneClient.mockImplementation(() => {
            return {
                sendFetch,
                sendBeacon
            };
        });
    });

    test('dispatch() sends data through client', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await expect(dispatch.dispatchFetch()).resolves.toBe(undefined);

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    test('when CredentialProvider is used then credentials are immediately fetched', async () => {
        // Init
        const credentialProvider: CredentialProvider = jest.fn();
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );

        // Run
        dispatch.setAwsCredentials(credentialProvider);

        // Assert
        expect(credentialProvider).toHaveBeenCalledTimes(1);
    });

    test('dispatch() throws exception when LogEventsCommand fails', async () => {
        // Init
        const sendFetch = jest.fn(() =>
            Promise.reject('Something went wrong.')
        );
        // @ts-ignore
        DataPlaneClient.mockImplementation(() => {
            return {
                sendFetch
            };
        });

        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        // Assert
        await expect(dispatch.dispatchFetch()).rejects.toEqual(
            'Something went wrong.'
        );
    });

    test('dispatch() does nothing when disabled', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        dispatch.disable();
        await dispatch.dispatchFetch();

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(0);
    });

    test('dispatch() sends when disabled then enabled', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        dispatch.disable();
        dispatch.enable();
        await dispatch.dispatchFetch();

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalledTimes(1);
    });

    test('dispatch() automatically dispatches when interval > 0', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
    });

    test('dispatch() does not automatically  dispatch when interval = 0', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: Utils.AUTO_DISPATCH_OFF }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
    });

    test('dispatch() does not automatically  dispatch when interval < 0', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: -1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
    });

    test('dispatch() does not automatically dispatch when dispatch is disabled', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.disable();

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).not.toHaveBeenCalled();
    });

    test('dispatch() resumes when disabled and enabled', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.disable();
        dispatch.enable();

        // Run
        await new Promise((resolve) =>
            window.setTimeout(() => resolve(undefined), 1)
        );

        // Assert
        expect(DataPlaneClient).toHaveBeenCalled();
        expect(sendFetch).toHaveBeenCalled();
    });

    test('when visibilitychange event is triggered then beacon dispatch runs', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendBeacon).toHaveBeenCalled();
    });

    test('when plugin is disabled then beacon dispatch does not run', async () => {
        // Init
        const dispatch = new Dispatch(
            APPLICATION_ID,
            Utils.AWS_RUM_REGION,
            Utils.AWS_RUM_ENDPOINT,
            Utils.createDefaultEventCacheWithEvents(),
            {
                ...defaultConfig,
                ...{ dispatchInterval: 1 }
            }
        );
        dispatch.setAwsCredentials(Utils.createAwsCredentials());
        dispatch.startDispatchTimer();
        dispatch.disable();

        // Run
        document.dispatchEvent(new Event('visibilitychange'));

        // Assert
        expect(sendBeacon).not.toHaveBeenCalled();
    });
});
