import Activity, {
    ACTIVITY_TYPES
} from "../models/activityModel.js";

export { ACTIVITY_TYPES };

/* Record an immutable activity event.
   All fields are trusted server-side values; the actor is always derived
   from the authenticated request, never from client input.

   Activity creation is best-effort by design: it never throws and never
   fails the primary operation that triggered it. A validation failure
   (missing actor/repository or an unknown type) returns null instead of
   writing a broken record. */
export const createActivity = async ({
    actor,
    type,
    repository,
    issue = null,
    pullRequest = null,
    tag = null,
    release = null,
    commitId = null,
    metadata = {}
}) => {
    if (!actor || !repository) {
        return null;
    }

    if (!ACTIVITY_TYPES.includes(type)) {
        return null;
    }

    try {
        return await Activity.create({
            actor,
            type,
            repository,
            issue,
            pullRequest,
            tag,
            release,
            commitId,
            metadata
        });
    } catch (error) {
        console.error(
            `Activity creation failed (${type}):`,
            error.message
        );
        return null;
    }
};
