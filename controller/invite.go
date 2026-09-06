package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

// resolveInviter maps an aff code to the inviting user's id. It reports false when
// registration must be refused: REGISTER_REQUIRE_INVITE_CODE is set and the code
// does not belong to an existing user. Without that flag an unknown or empty code
// simply means "no inviter", matching upstream behaviour.
func resolveInviter(affCode string) (int, bool) {
	inviterId, err := model.GetUserIdByAffCode(affCode)
	if err != nil {
		inviterId = 0
	}
	if common.RegisterRequireInviteCode && inviterId == 0 {
		return 0, false
	}
	return inviterId, true
}

type OAuthInviteCodeRequiredError struct{}

func (e *OAuthInviteCodeRequiredError) Error() string {
	return "registration requires a valid invite code"
}
