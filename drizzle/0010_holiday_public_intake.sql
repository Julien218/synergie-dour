-- Public submissions own only a new private dossier. They never resolve an
-- existing merchant by email. Attachment to the CRM requires an administrator.
ALTER TABLE holiday_dossiers
  MODIFY merchantId INT NULL,
  MODIFY invitedBy INT NULL,
  MODIFY membershipConfirmedAtMs BIGINT NULL;
