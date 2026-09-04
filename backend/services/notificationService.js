import User from "../models/userModel.js";
import Notification, {
    NOTIFICATION_TYPES
} from "../models/notificationModel.js";
import { emitDomainEvent } from "./domainEvents.js";
import { RT_EVENT } from "../realtime/eventTypes.js";

const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

const MESSAGE_TEMPLATES = {
    ISSUE_CREATED: (ctx) =>
        `opened an issue in your repository: "${ctx.title}"`,
    ISSUE_COMMENTED: (ctx) =>
        `commented on your issue: "${ctx.title}"`,
    PR_CREATED: (ctx) =>
        `opened a pull request in your repository: "${ctx.title}" (#${ctx.number})`,
    PR_COMMENTED: (ctx) =>
        `commented on your pull request: "${ctx.title}" (#${ctx.number})`,
    PR_REVIEWED: (ctx) =>
        `reviewed your pull request: "${ctx.title}" (#${ctx.number})`,
    PR_APPROVED: (ctx) =>
        `approved your pull request: "${ctx.title}" (#${ctx.number})`,
    PR_CHANGES_REQUESTED: (ctx) =>
        `requested changes on your pull request: "${ctx.title}" (#${ctx.number})`,
    PR_REVIEW_REQUIREMENTS_MET: (ctx) =>
        `review requirements are now satisfied for: "${ctx.title}" (#${ctx.number})`,
    PR_MERGED: (ctx) =>
        `merged your pull request: "${ctx.title}" (#${ctx.number})`,
    PR_CLOSED: (ctx) =>
        `closed your pull request: "${ctx.title}" (#${ctx.number})`,
    PR_REOPENED: (ctx) =>
        `reopened your pull request: "${ctx.title}" (#${ctx.number})`,
    MENTION: (ctx) =>
        `mentioned you in a comment on: "${ctx.title}"`,
    REPOSITORY_STARRED: () =>
        "starred your repository",
    RELEASE_PUBLISHED: (ctx) =>
        `published a release in your repository: "${ctx.title}"`,
    REPOSITORY_FORKED: (ctx) =>
        `forked your repository "${ctx.name}"`
};

export const buildNotificationMessage = (type, context = {}) => {
    const template = MESSAGE_TEMPLATES[type];

    if (!template) {
        return "";
    }

    return template(context);
};

export const createNotification = async ({
    recipient,
    actor,
    type,
    repository,
    issue = null,
    pullRequest = null,
    comment = null,
    release = null,
    message
}) => {
    if (!recipient || !actor) {
        return null;
    }

    if (recipient.toString() === actor.toString()) {
        return null;
    }

    if (!NOTIFICATION_TYPES.includes(type)) {
        return null;
    }

    let notification;

    try {
        notification = await Notification.create({
            recipient,
            actor,
            type,
            repository,
            issue,
            pullRequest,
            comment,
            release,
            message
        });
    } catch (error) {
        /* best-effort — a notification failure must never fail the
           primary operation. Log and return null. */
        if (typeof console !== "undefined" && console.error) {
            console.error("createNotification failed:", error.message);
        }
        return null;
    }

    try {
        emitDomainEvent(RT_EVENT.NOTIFICATION_CREATED, {
            recipientId: recipient.toString(),
            notification
        });
    } catch {
        // best-effort — never fail the primary operation
    }

    return notification;
};

export const extractMentionedUserNames = (content) => {
    const names = new Set();
    const text = typeof content === "string" ? content : "";
    let match;

    while ((match = MENTION_PATTERN.exec(text)) !== null) {
        names.add(match[1]);
    }

    return Array.from(names);
};

export const createMentionNotifications = async ({
    content,
    actor,
    repository,
    issue = null,
    pullRequest = null,
    excludeRecipients = []
}) => {
    const names = extractMentionedUserNames(content);

    if (names.length === 0) {
        return 0;
    }

    const mentionedUsers = await User.find({
        userName: { $in: names }
    });

    const excludedIds = new Set(
        excludeRecipients.map((id) => id.toString())
    );

    const title = issue
        ? issue.title
        : pullRequest
            ? pullRequest.title
            : "a resource";

    let count = 0;

    for (const user of mentionedUsers) {
        if (user._id.toString() === actor.toString()) {
            continue;
        }

        if (excludedIds.has(user._id.toString())) {
            continue;
        }

        const notification = await createNotification({
            recipient: user._id,
            actor,
            type: "MENTION",
            repository,
            issue: issue ? issue._id : null,
            pullRequest: pullRequest ? pullRequest._id : null,
            message: buildNotificationMessage("MENTION", { title })
        });

        if (notification) {
            count += 1;
        }
    }

    return count;
};
