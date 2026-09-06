package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestResolveInviter(t *testing.T) {
	db := openTokenControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	require.NoError(t, db.Create(&model.User{
		Id:       7,
		Username: "inviter",
		Password: "password",
		AffCode:  "INV7",
		Status:   common.UserStatusEnabled,
	}).Error)

	t.Run("open registration keeps upstream behaviour", func(t *testing.T) {
		common.RegisterRequireInviteCode = false

		id, ok := resolveInviter("")
		require.True(t, ok)
		require.Equal(t, 0, id)

		id, ok = resolveInviter("unknown")
		require.True(t, ok)
		require.Equal(t, 0, id)

		id, ok = resolveInviter("INV7")
		require.True(t, ok)
		require.Equal(t, 7, id)
	})

	t.Run("invite-only rejects missing or unknown code", func(t *testing.T) {
		common.RegisterRequireInviteCode = true
		t.Cleanup(func() { common.RegisterRequireInviteCode = false })

		_, ok := resolveInviter("")
		require.False(t, ok)

		_, ok = resolveInviter("unknown")
		require.False(t, ok)

		id, ok := resolveInviter("INV7")
		require.True(t, ok)
		require.Equal(t, 7, id)
	})
}
